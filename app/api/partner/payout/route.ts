import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { createPayoutTransfer } from '@/lib/stripe/connect';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getPartnerPlacementPayoutUsd } from '@/lib/partner/partnerPayout';
import { z } from 'zod';

const payoutSchema = z.object({
  partnerId: z.string().uuid(),
  placementId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await requireAdmin(user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = payoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const { partnerId, placementId } = parsed.data;

    const orgId = await getActorOrganizationId(user.id);
    const partner = await withTenantScope(orgId, (db) =>
      db.partner.findUnique({
        where: { id: partnerId },
        select: { stripeConnectId: true, stripeConnectStatus: true, name: true },
      }),
    );

    if (!partner || !partner.stripeConnectId) {
      return NextResponse.json({ error: 'Partner has no connected Stripe account' }, { status: 400 });
    }

    if (partner.stripeConnectStatus !== 'active') {
      return NextResponse.json({ error: 'Partner Stripe account is not active' }, { status: 400 });
    }

    const payoutAmount = getPartnerPlacementPayoutUsd();
    const amountCents = Math.round(payoutAmount * 100);

    const transfer = await createPayoutTransfer(amountCents, partner.stripeConnectId, {
      partnerId,
      placementId,
      triggeredBy: user.id,
    });

    return NextResponse.json({
      transferId: transfer.id,
      amount: payoutAmount,
    });
  } catch (error) {
    console.error('[partner/payout] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
