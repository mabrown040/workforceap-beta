import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getStripe, EMPLOYER_TIERS, isValidTier } from '@/lib/stripe/client';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getEmployerForUser(user.id);
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden: employer access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const tier = body.tier;
    if (!isValidTier(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const employer = await prisma.$transaction((tx) => tx.employer.findUnique({
      where: { id: ctx.employerId },
      select: { organizationId: true, stripeCustomerId: true, contactEmail: true, companyName: true },
    }));
    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
    }

    const stripe = getStripe();
    let customerId = employer.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: employer.contactEmail,
        name: employer.companyName,
        metadata: { employerId: ctx.employerId, userId: user.id },
      });
      customerId = customer.id;
      await withTenantScope(employer.organizationId, (db) =>
        db.employer.update({
          where: { id: ctx.employerId },
          data: { stripeCustomerId: customerId },
        }),
      );
    }

    const tierConfig = EMPLOYER_TIERS[tier];
    if (!tierConfig.priceId) {
      return NextResponse.json({ error: 'Price not configured for tier' }, { status: 503 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || 'https://www.workforceap.org';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: tierConfig.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/employer/billing?success=1`,
      cancel_url: `${origin}/employer/billing?canceled=1`,
      metadata: {
        employerId: ctx.employerId,
        tier,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          employerId: ctx.employerId,
          tier,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[employer/checkout] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
