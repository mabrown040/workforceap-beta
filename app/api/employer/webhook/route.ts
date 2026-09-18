import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe/client';
import { reconcileEmployerSubscription } from '@/lib/stripe/subscriptionPersistence';
import { canonicalSubscriptionSnapshot, stripeObjectId } from '@/lib/stripe/stripeSubscriptionSnapshot';
import type Stripe from 'stripe';

import { withApiGuc } from '@/lib/db/withRequestGuc';

async function resolveEmployer(
  employerId: string | undefined,
  userId: string | undefined,
  subscriptionId: string,
) {
  return prisma.employer.findFirst({
    where: employerId
      ? { id: employerId }
      : userId
        ? { userId }
        : { stripeSubscriptionId: subscriptionId },
    select: { id: true, userId: true, stripeCustomerId: true },
  });
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

    try {
      let subscriptionId: string | null = null;
      let employerId: string | undefined;
      let userId: string | undefined;
      let tier: string | undefined;
      let replacesSubscriptionId: string | null = null;
      let kind: 'checkout' | 'subscription_deleted' | 'invoice_succeeded' | 'invoice_failed';

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          subscriptionId = stripeObjectId(session.subscription);
          employerId = session.metadata?.employerId;
          userId = session.metadata?.userId;
          tier = session.metadata?.tier;
          replacesSubscriptionId = session.metadata?.replacesSubscriptionId || null;
          kind = 'checkout';
          if (session.payment_status && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
            return NextResponse.json({ received: true });
          }
          break;
        }
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          subscriptionId = stripeObjectId((invoice as unknown as { subscription?: string | { id: string } }).subscription)
            ?? stripeObjectId(invoice.parent?.subscription_details?.subscription);
          employerId = invoice.metadata?.employerId ?? invoice.parent?.subscription_details?.metadata?.employerId;
          userId = invoice.metadata?.userId ?? invoice.parent?.subscription_details?.metadata?.userId;
          kind = event.type === 'invoice.payment_failed' ? 'invoice_failed' : 'invoice_succeeded';
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          subscriptionId = subscription.id;
          employerId = subscription.metadata?.employerId;
          userId = subscription.metadata?.userId;
          kind = 'subscription_deleted';
          tier = 'basic';
          break;
        }
        default:
          console.log(`[employer/webhook] unhandled event type: ${event.type}`);
          return NextResponse.json({ received: true });
      }

      if (!subscriptionId) return NextResponse.json({ received: true });
      if (kind === 'checkout' && !employerId && !userId) {
        throw new Error('Checkout subscription ownership is unresolved');
      }
      const employer = await resolveEmployer(employerId, userId, subscriptionId);
      if (!employer) throw new Error('Employer subscription ownership is unresolved');

      await reconcileEmployerSubscription(
        prisma,
        {
          employerId: employer.id,
          userId: employer.userId,
          customerId: employer.stripeCustomerId,
        },
        {
          subscriptionId,
          eventCreated: event.created,
          eventId: event.id,
          kind,
          replacesSubscriptionId,
          ...(tier ? { tier } : {}),
        },
        async () => canonicalSubscriptionSnapshot(
          await getStripe().subscriptions.retrieve(subscriptionId),
        ),
      );

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
