import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeConnectWebhookSecret, getStripeWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

import { logWebhookEvent } from '@/lib/webhooks/logEvent';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withSystemGuc } from '@/lib/db/withRequestGuc';
import {
  applyEmployerSubscriptionTransition,
  applyOrganizationSubscriptionTransition,
  organizationSubscriptionIsAuthoritative,
  userSubscriptionIsAuthoritative,
} from '@/lib/stripe/subscriptionPersistence';

function normalizeStripeId(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' && id ? id : null;
  }
  return null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = normalizeStripeId((invoice as unknown as { subscription?: unknown }).subscription);
  if (legacy) return legacy;
  return normalizeStripeId(invoice.parent?.subscription_details?.subscription);
}

// withSystemGuc(fn) EXECUTES fn immediately and returns a Promise — it's
// not a route-handler factory like withApiGuc. The previous `export const
// POST = withSystemGuc(async (request) => {...})` ran the inner function
// at module-load time with `request` undefined and exported a Promise
// instead of a callable handler. Wrap with a real handler that defers
// execution until Next.js actually invokes POST with the request.
export async function POST(request: NextRequest) {
  return withSystemGuc(async () => {
  try {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature') || '';
  
    let event: Stripe.Event;
    try {
      // Try platform webhook secret first (checkout, subscription, invoice events)
      event = getStripe().webhooks.constructEvent(payload, sig, getStripeWebhookSecret());
    } catch (platformErr: unknown) {
      // Platform secret failed — try Connect secret (account, transfer, payout events)
      try {
        event = getStripe().webhooks.constructEvent(payload, sig, getStripeConnectWebhookSecret());
      } catch (connectErr: unknown) {
        const msg = connectErr instanceof Error ? connectErr.message : 'Unknown error';
        console.error('[stripe/webhook] signature verification failed for both platform and Connect secrets:', msg);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    }
  
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId = session.metadata?.organizationId;
          if (!orgId) {
            console.warn('[stripe/webhook] checkout.session.completed missing organizationId metadata');
            break;
          }
          const subscriptionId = normalizeStripeId(session.subscription);
          if (session.payment_status === 'paid' && subscriptionId) {
            await prisma.$transaction((tx) => applyOrganizationSubscriptionTransition(tx, orgId, {
              subscriptionId,
              status: 'active',
              eventCreated: event.created,
              eventId: event.id,
              kind: 'checkout',
              bindingAuthorized: true,
              replacesSubscriptionId: session.metadata?.replacesSubscriptionId ?? null,
            }));
          }
          break;
        }
        // Stripe never emits a bare `subscription.updated` / `subscription.canceled`
        // event — the canonical event names are namespaced under `customer.*`,
        // and the cancellation event is `deleted` (not `canceled`). Using the
        // wrong strings meant this branch silently never matched in production.
        case 'customer.subscription.updated': {
          const delivered = event.data.object as Stripe.Subscription;
          // Stripe delivery order is not lifecycle order. Always reconcile this
          // ambiguous snapshot against Stripe's current subscription object.
          const subscription = await getStripe().subscriptions.retrieve(delivered.id);
          if (subscription.id !== delivered.id) {
            throw new Error('Stripe subscription reconciliation returned the wrong identity');
          }
          const orgId = subscription.metadata?.organizationId ?? delivered.metadata?.organizationId;
          const userId = subscription.metadata?.userId ?? delivered.metadata?.userId;
          const status = subscription.status === 'canceled'
            ? 'canceled'
            : subscription.status === 'active' || subscription.status === 'trialing'
              ? 'active'
              : 'past_due';
          if (orgId) {
            await prisma.$transaction(async (tx) => {
              const bindingAuthorized = await organizationSubscriptionIsAuthoritative(
                tx,
                orgId,
                subscription.id,
              );
              await applyOrganizationSubscriptionTransition(tx, orgId, {
                subscriptionId: subscription.id,
                status,
                eventCreated: event.created,
                eventId: event.id,
                kind: 'subscription_reconciled',
                bindingAuthorized,
                replacesSubscriptionId: null,
              });
            });
          } else if (userId) {
            await prisma.$transaction(async (tx) => {
              const employer = await tx.employer.findUnique({ where: { userId }, select: { id: true } });
              if (!employer) return;
              const bindingAuthorized = await userSubscriptionIsAuthoritative(
                tx,
                userId,
                subscription.id,
              );
              const applied = await applyEmployerSubscriptionTransition(tx, employer.id, {
                subscriptionId: subscription.id,
                status: subscription.status,
                eventCreated: event.created,
                eventId: event.id,
                kind: 'subscription_reconciled',
                bindingAuthorized,
                replacesSubscriptionId: null,
              });
              if (applied === 'applied') {
                await tx.employerSubscription.updateMany({
                  where: { userId, stripeSubscriptionId: subscription.id },
                  data: { status: subscription.status },
                });
              }
            });
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const orgId = subscription.metadata?.organizationId;
          const userId = subscription.metadata?.userId;
          if (orgId) {
            await prisma.$transaction((tx) => applyOrganizationSubscriptionTransition(tx, orgId, {
              subscriptionId: subscription.id,
              status: 'canceled',
              eventCreated: event.created,
              eventId: event.id,
              kind: 'subscription_deleted',
              bindingAuthorized: false,
              replacesSubscriptionId: null,
            }));
          } else if (userId) {
            await prisma.$transaction(async (tx) => {
              const employer = await tx.employer.findUnique({ where: { userId }, select: { id: true } });
              if (!employer) return;
              const applied = await applyEmployerSubscriptionTransition(tx, employer.id, {
                subscriptionId: subscription.id,
                status: 'canceled',
                eventCreated: event.created,
                eventId: event.id,
                kind: 'subscription_deleted',
                bindingAuthorized: false,
                replacesSubscriptionId: null,
              });
              if (applied === 'applied') {
                await tx.employerSubscription.updateMany({
                  where: { userId, stripeSubscriptionId: subscription.id },
                  data: { status: 'canceled' },
                });
              }
            });
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const orgId = invoice.metadata?.organizationId ?? invoice.parent?.subscription_details?.metadata?.organizationId;
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (!orgId || !subscriptionId) break;
          await prisma.$transaction((tx) => applyOrganizationSubscriptionTransition(tx, orgId, {
            subscriptionId,
            status: 'past_due',
            eventCreated: event.created,
            eventId: event.id,
            kind: 'invoice_failed',
            bindingAuthorized: false,
            replacesSubscriptionId: null,
          }));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const orgId = invoice.metadata?.organizationId ?? invoice.parent?.subscription_details?.metadata?.organizationId;
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (!orgId || !subscriptionId) break;
          await prisma.$transaction((tx) => applyOrganizationSubscriptionTransition(tx, orgId, {
            subscriptionId,
            status: 'active',
            eventCreated: event.created,
            eventId: event.id,
            kind: 'invoice_succeeded',
            bindingAuthorized: false,
            replacesSubscriptionId: null,
          }));
          break;
        }
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          const partnerId = account.metadata?.partnerId;
          if (!partnerId) {
            console.warn('[stripe/webhook] account.updated missing partnerId metadata');
            break;
          }
  
          const isActive =
            account.details_submitted &&
            !account.requirements?.currently_due?.length &&
            !account.requirements?.past_due?.length;
  
          await prisma.$transaction((tx) => tx.partner.updateMany({
            where: { id: partnerId, stripeConnectId: account.id },
            data: { stripeConnectStatus: isActive ? 'active' : 'pending' },
          }));
          break;
        }
        case 'transfer.failed' as any: {
          const transfer = event.data.object as Stripe.Transfer;
          console.error('[stripe/webhook] transfer.failed', {
            transferId: transfer.id,
            destination: transfer.destination,
            metadata: transfer.metadata,
          });
          await logWebhookEvent({
            source: 'stripe',
            eventType: event.type,
            eventId: event.id,
            payloadSize: Buffer.byteLength(payload, 'utf8'),
            status: 'failed',
            errorMessage: `Transfer ${transfer.id} to ${transfer.destination} failed`,
          });
          captureApiError(new Error(`Stripe transfer.failed: ${transfer.id}`), {
            route: 'stripe/webhook',
            extra: {
              transferId: transfer.id,
              destination: transfer.destination,
              metadata: transfer.metadata,
            },
          });
          break;
        }
        case 'transfer.paid' as any: {
          const transfer = event.data.object as Stripe.Transfer;
          console.log('[stripe/webhook] transfer.paid', {
            transferId: transfer.id,
            destination: transfer.destination,
            metadata: transfer.metadata,
          });
          break;
        }
        case 'payout.failed': {
          const payout = event.data.object as Stripe.Payout;
          console.error('[stripe/webhook] payout.failed', {
            payoutId: payout.id,
            status: payout.status,
            failure_code: payout.failure_code,
          });
          await logWebhookEvent({
            source: 'stripe',
            eventType: event.type,
            eventId: event.id,
            payloadSize: Buffer.byteLength(payload, 'utf8'),
            status: 'failed',
            errorMessage: `Payout ${payout.id} failed: ${payout.failure_code ?? payout.status}`,
          });
          captureApiError(new Error(`Stripe payout.failed: ${payout.id}`), {
            route: 'stripe/webhook',
            extra: {
              payoutId: payout.id,
              status: payout.status,
              failure_code: payout.failure_code,
            },
          });
          break;
        }
        default:
          console.log(`[stripe/webhook] unhandled event type: ${event.type}`);
      }
  
      return NextResponse.json({ received: true });
    } catch (err) {
      console.error('[stripe/webhook] processing error:', err);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
    } catch (error) {
      console.error('/stripe/webhook:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
}
