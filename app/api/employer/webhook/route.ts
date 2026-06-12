import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (request: NextRequest) => {
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

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const employerId = session.metadata?.employerId;
          const tier = session.metadata?.tier;
          const subscriptionId = session.subscription as string | undefined;

          if (!employerId || !tier) {
            console.warn('[employer/webhook] missing metadata', session.metadata);
            break;
          }

          // Idempotency: skip if employer already has this subscription + tier
          const existing = await prisma.$transaction((tx) => tx.employer.findUnique({
            where: { id: employerId },
            select: { tier: true, stripeSubscriptionId: true },
          }));
          if (existing?.tier === tier && existing?.stripeSubscriptionId === subscriptionId) {
            console.log('[employer/webhook] checkout.session.completed — already applied, skipping');
            break;
          }

          await prisma.$transaction((tx) => tx.employer.update({
            where: { id: employerId },
            data: {
              tier,
              stripeSubscriptionId: subscriptionId ?? null,
              stripeSubscriptionStatus: subscriptionId ? 'active' : null,
            },
          }));
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | undefined;
          if (!subscriptionId) break;

          // Idempotency: skip if all matching employers are already active
          const stale = await prisma.$transaction((tx) => tx.employer.count({
            where: { stripeSubscriptionId: subscriptionId, stripeSubscriptionStatus: { not: 'active' } },
          }));
          if (stale === 0) {
            console.log('[employer/webhook] invoice.payment_succeeded — already active, skipping');
            break;
          }

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { stripeSubscriptionStatus: 'active' },
          }));
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | undefined;
          if (!subscriptionId) break;

          // Idempotency: skip if all matching employers are already past_due
          const stale = await prisma.$transaction((tx) => tx.employer.count({
            where: { stripeSubscriptionId: subscriptionId, stripeSubscriptionStatus: { not: 'past_due' } },
          }));
          if (stale === 0) {
            console.log('[employer/webhook] invoice.payment_failed — already past_due, skipping');
            break;
          }

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { stripeSubscriptionStatus: 'past_due' },
          }));
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;

          // Idempotency: skip if all matching employers are already canceled + basic
          const stale = await prisma.$transaction((tx) => tx.employer.count({
            where: {
              stripeSubscriptionId: subscription.id,
              OR: [
                { stripeSubscriptionStatus: { not: 'canceled' } },
                { tier: { not: 'basic' } },
              ],
            },
          }));
          if (stale === 0) {
            console.log('[employer/webhook] customer.subscription.deleted — already applied, skipping');
            break;
          }

          await prisma.$transaction((tx) => tx.employer.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { tier: 'basic', stripeSubscriptionStatus: 'canceled' },
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
