import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function orderedEmployerWhere(eventCreatedAt: number, eventId: string) {
  return {
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

          // Checkout is the legitimate replacement path: it may establish a new
          // authoritative subscription, but only if its event cursor wins atomically.
          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: {
              id: employerId,
              ...orderedEmployerWhere(eventCreatedAt, event.id),
            },
            data: {
              tier,
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionStatus: 'active',
              stripeSubscriptionEventAt: eventCreatedAt,
              stripeSubscriptionEventId: event.id,
            },
          }));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
          if (!subscriptionId) break;

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: {
              stripeSubscriptionId: subscriptionId,
              ...orderedEmployerWhere(eventCreatedAt, event.id),
            },
            data: {
              stripeSubscriptionStatus: 'active',
              stripeSubscriptionEventAt: eventCreatedAt,
              stripeSubscriptionEventId: event.id,
            },
          }));
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
          if (!subscriptionId) break;

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: {
              stripeSubscriptionId: subscriptionId,
              ...orderedEmployerWhere(eventCreatedAt, event.id),
            },
            data: {
              stripeSubscriptionStatus: 'past_due',
              stripeSubscriptionEventAt: eventCreatedAt,
              stripeSubscriptionEventId: event.id,
            },
          }));
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: {
              stripeSubscriptionId: subscription.id,
              ...orderedEmployerWhere(eventCreatedAt, event.id),
            },
            data: {
              tier: 'basic',
              stripeSubscriptionStatus: 'canceled',
              stripeSubscriptionEventAt: eventCreatedAt,
              stripeSubscriptionEventId: event.id,
            },
          }));
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
