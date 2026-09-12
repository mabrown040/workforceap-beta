import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeConnectWebhookSecret, getStripeWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

import { logWebhookEvent } from '@/lib/webhooks/logEvent';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withSystemGuc } from '@/lib/db/withRequestGuc';

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

function orderedOrganizationWhere(
  organizationId: string,
  eventCreatedAt: number,
  eventId: string,
  subscriptionId?: string,
) {
  return {
    id: organizationId,
    ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    OR: [
      { stripeSubscriptionEventAt: null },
      { stripeSubscriptionEventAt: { lt: eventCreatedAt } },
      {
        AND: [
          { stripeSubscriptionEventAt: eventCreatedAt },
          {
            OR: [
              { stripeSubscriptionEventId: null },
              { stripeSubscriptionEventId: { lt: eventId } },
            ],
          },
        ],
      },
    ],
  };
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
            await prisma.$transaction((tx) => tx.organization.updateMany({
              where: orderedOrganizationWhere(orgId, event.created, event.id),
              data: {
                subscriptionStatus: 'active',
                stripeSubscriptionId: subscriptionId,
                stripeSubscriptionEventAt: event.created,
                stripeSubscriptionEventId: event.id,
              },
            }));
          }
          break;
        }
        // Stripe never emits a bare `subscription.updated` / `subscription.canceled`
        // event — the canonical event names are namespaced under `customer.*`,
        // and the cancellation event is `deleted` (not `canceled`). Using the
        // wrong strings meant this branch silently never matched in production.
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const orgId = subscription.metadata?.organizationId;
          const userId = subscription.metadata?.userId;
          const status = subscription.status === 'active' ? 'active' : 'past_due';
          if (orgId) {
            await prisma.$transaction((tx) => tx.organization.updateMany({
              where: orderedOrganizationWhere(orgId, event.created, event.id, subscription.id),
              data: {
                subscriptionStatus: status,
                stripeSubscriptionEventAt: event.created,
                stripeSubscriptionEventId: event.id,
              },
            }));
          } else if (userId) {
            await prisma.$transaction([
              prisma.employer.updateMany({
                where: { userId },
                data: { stripeSubscriptionStatus: subscription.status },
              }),
              prisma.employerSubscription.updateMany({
                where: { userId, stripeSubscriptionId: subscription.id },
                data: { status: subscription.status },
              }),
            ]);
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const orgId = subscription.metadata?.organizationId;
          const userId = subscription.metadata?.userId;
          if (orgId) {
            await prisma.$transaction((tx) => tx.organization.updateMany({
              where: orderedOrganizationWhere(orgId, event.created, event.id, subscription.id),
              data: {
                subscriptionStatus: 'canceled',
                stripeSubscriptionEventAt: event.created,
                stripeSubscriptionEventId: event.id,
              },
            }));
          } else if (userId) {
            await prisma.$transaction([
              prisma.employer.updateMany({
                where: { userId },
                data: { stripeSubscriptionStatus: 'canceled' },
              }),
              prisma.employerSubscription.updateMany({
                where: { userId, stripeSubscriptionId: subscription.id },
                data: { status: 'canceled' },
              }),
            ]);
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const orgId = invoice.metadata?.organizationId ?? invoice.parent?.subscription_details?.metadata?.organizationId;
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (!orgId || !subscriptionId) break;
          await prisma.$transaction((tx) => tx.organization.updateMany({
            where: orderedOrganizationWhere(orgId, event.created, event.id, subscriptionId),
            data: {
              subscriptionStatus: 'past_due',
              stripeSubscriptionEventAt: event.created,
              stripeSubscriptionEventId: event.id,
            },
          }));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const orgId = invoice.metadata?.organizationId ?? invoice.parent?.subscription_details?.metadata?.organizationId;
          const subscriptionId = invoiceSubscriptionId(invoice);
          if (!orgId || !subscriptionId) break;
          await prisma.$transaction((tx) => tx.organization.updateMany({
            where: orderedOrganizationWhere(orgId, event.created, event.id, subscriptionId),
            data: {
              subscriptionStatus: 'active',
              stripeSubscriptionEventAt: event.created,
              stripeSubscriptionEventId: event.id,
            },
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
