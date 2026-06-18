import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getUser } from '@/lib/auth/server';
import { getStripe } from '@/lib/stripe/client';
import { getStripeCustomer } from '@/lib/stripe/customer';
import { getStripePriceId } from '@/lib/stripe/pricing';
import { prisma } from '@/lib/db/prisma';
import { getProfileRole } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

const subscribeSchema = z.object({
  tier: z.enum(['starter', 'growth', 'enterprise']),
});

async function _POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = await getProfileRole(user.id);
  if (!roles.includes('employer')) {
    return NextResponse.json({ error: 'Employer access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const { tier } = parsed.data;

  const stripe = getStripe();
  const customerId = await getStripeCustomer(user.id, user.email ?? '', user.user_metadata?.name as string | undefined);
  const priceId = getStripePriceId(tier);

  if (!priceId) {
    return NextResponse.json({ error: 'Tier not available' }, { status: 400 });
  }

  // Check for existing active subscription
  const existing = await prisma.employerSubscription.findFirst({
    where: { userId: user.id, status: { in: ['active', 'trialing'] } },
  });

  if (existing) {
    return NextResponse.json({
      error: 'Already subscribed',
      subscriptionId: existing.stripeSubscriptionId,
      portalUrl: '/employer/billing',
    }, { status: 409 });
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 14,
    metadata: {
      userId: user.id,
      tier,
    },
  }) as Stripe.Subscription;

  await prisma.$transaction([
    prisma.employerSubscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        tier,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    }),
    // Sync stripe fields to the Employer record so employer.stripeSubscriptionStatus
    // is readable by the billing page without joining employer_subscriptions.
    prisma.employer.update({
      where: { userId: user.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
      },
    }),
  ]);

  auditLog({ actorUserId: user.id, action: 'employer_subscribe', targetType: 'EmployerSubscription', targetId: subscription.id }).catch(() => {});
  logAuditEvent({ user: { id: user.id, role: 'employer' }, verb: 'created', object: { type: 'EmployerSubscription', id: subscription.id }, result: { success: true } }).catch(() => {});
  return NextResponse.json({
    subscriptionId: subscription.id,
    status: subscription.status,
    trialEnd: subscription.trial_end,
    portalUrl: '/employer/billing',
  });
}
export const POST = withApiGuc(_POST);
