import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { applyEmployerSubscriptionTransition } from '@/lib/stripe/subscriptionPersistence';

export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(payload, sig, getStripeWebhookSecret());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[employer/webhook] signature verification failed:', msg);
      return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
    }

    const eventCreatedAt = event.created;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const employerId = session.metadata?.employerId;
          const tier = session.metadata?.tier;
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

          if (!employerId || !tier || !subscriptionId) {
            console.warn('[employer/webhook] missing metadata or subscription identity');
            break;
          }

          await prisma.$transaction((tx) => applyEmployerSubscriptionTransition(tx, employerId, {
            subscriptionId,
            status: 'active',
            eventCreated: eventCreatedAt,
            eventId: event.id,
            kind: 'checkout',
            bindingAuthorized: true,
            replacesSubscriptionId: session.metadata?.replacesSubscriptionId ?? null,
            tier,
          }));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
          if (!subscriptionId) break;

          await prisma.$transaction(async (tx) => {
            const employer = await tx.employer.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
              select: { id: true },
            });
            if (!employer) return;
            await applyEmployerSubscriptionTransition(tx, employer.id, {
              subscriptionId,
              status: 'active',
              eventCreated: eventCreatedAt,
              eventId: event.id,
              kind: 'invoice_succeeded',
              bindingAuthorized: false,
              replacesSubscriptionId: null,
            });
          });
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
          if (!subscriptionId) break;

          await prisma.$transaction(async (tx) => {
            const employer = await tx.employer.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
              select: { id: true },
            });
            if (!employer) return;
            await applyEmployerSubscriptionTransition(tx, employer.id, {
              subscriptionId,
              status: 'past_due',
              eventCreated: eventCreatedAt,
              eventId: event.id,
              kind: 'invoice_failed',
              bindingAuthorized: false,
              replacesSubscriptionId: null,
            });
          });
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          await prisma.$transaction(async (tx) => {
            const employer = await tx.employer.findFirst({
              where: { stripeSubscriptionId: subscription.id },
              select: { id: true },
            });
            if (!employer) return;
            await applyEmployerSubscriptionTransition(tx, employer.id, {
              subscriptionId: subscription.id,
              status: 'canceled',
              eventCreated: eventCreatedAt,
              eventId: event.id,
              kind: 'subscription_deleted',
              bindingAuthorized: false,
              replacesSubscriptionId: null,
              tier: 'basic',
            });
          });
          break;
        }
        default:
          console.log(`[employer/webhook] unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error('[employer/webhook] processing error:', err);
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('/employer/webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
