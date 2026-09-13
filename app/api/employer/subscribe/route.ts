import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { z } from 'zod';
import Stripe from 'stripe';
import { getUser } from '@/lib/auth/server';
import { EMPLOYER_PRICING_ENFORCED, getStripe } from '@/lib/stripe/client';
import { getStripeCustomer } from '@/lib/stripe/customer';
import { getStripePriceId } from '@/lib/stripe/pricing';
import { prisma } from '@/lib/db/prisma';
import { getProfileRole } from '@/lib/auth/roles';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { withDbRetry } from '@/lib/db/withDbRetry';
import { reconcileEmployerSubscription } from '@/lib/stripe/subscriptionPersistence';
import { canonicalSubscriptionSnapshot } from '@/lib/stripe/stripeSubscriptionSnapshot';

const subscribeSchema = z.object({
  tier: z.enum(['starter', 'growth', 'enterprise']),
});

async function _POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = await withDbRetry(() => getProfileRole(user.id)).catch((err) => {
    console.error('[api:employer-subscribe] profileRole lookup failed; degrading to member', err);
    return 'member';
  });
  if (!roles.includes('employer')) {
    return NextResponse.json({ error: 'Employer access required' }, { status: 403 });
  }

  if (!EMPLOYER_PRICING_ENFORCED) {
    return NextResponse.json({ error: 'Employer pricing is not available' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const { tier } = parsed.data;
  const employer = await prisma.employer.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      organizationId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionRevision: true,
      stripeCustomerId: true,
    },
  });
  if (!employer) {
    return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
  }

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
      employerId: employer.id,
      organizationId: employer.organizationId,
      replacesSubscriptionId: employer.stripeSubscriptionId ?? '',
      tier,
    },
  }, {
    idempotencyKey: `employer-subscribe:${employer.id}:${employer.stripeSubscriptionRevision}:${tier}`,
  }) as Stripe.Subscription;

  await reconcileEmployerSubscription(
    prisma,
    {
      employerId: employer.id,
      userId: user.id,
      customerId: employer.stripeCustomerId ?? customerId,
    },
    {
      subscriptionId: subscription.id,
      eventCreated: subscription.created,
      eventId: `direct:${subscription.id}`,
      kind: 'direct_subscribe',
      replacesSubscriptionId: employer.stripeSubscriptionId,
      tier,
    },
    async () => canonicalSubscriptionSnapshot(
      await stripe.subscriptions.retrieve(subscription.id),
    ),
    async (tx, next) => {
      await tx.employerSubscription.create({
        data: {
          userId: user.id,
          organizationId: employer.organizationId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          tier,
          status: next.status ?? subscription.status,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      });
    },
  );

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
