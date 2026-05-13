import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStripe, getStripeConnectWebhookSecret } from '@/lib/stripe/client';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, sig, getStripeConnectWebhookSecret());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
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

        await prisma.partner.updateMany({
          where: { id: partnerId, stripeConnectId: account.id },
          data: { stripeConnectStatus: isActive ? 'active' : 'pending' },
        });
        break;
      }
      case 'transfer.failed' as any: {
        const transfer = event.data.object as Stripe.Transfer;
        console.error('[stripe/webhook] transfer.failed', {
          transferId: transfer.id,
          destination: transfer.destination,
          metadata: transfer.metadata,
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
}
