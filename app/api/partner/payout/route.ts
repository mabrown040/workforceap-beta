import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { createPayoutTransfer } from '@/lib/stripe/connect';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { buildPartnerPayoutIdempotencyKey, getPartnerPlacementPayoutUsd } from '@/lib/partner/partnerPayout';
import { isPayoutEligibleType } from '@/lib/partner/partnerType';
import { getPlacementPayoutRejection } from '@/lib/partner/payoutEligibility';
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
        select: {
          stripeConnectId: true,
          stripeConnectStatus: true,
          name: true,
          partnerType: true,
        },
      }),
    );

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Hard gate: only `referral` partners may be paid. Defense-in-depth on top
    // of the admin role check above — an admin shouldn't be able to trigger a
    // payout on a community partner even if the UI somehow surfaces the action.
    if (!isPayoutEligibleType(partner.partnerType)) {
      return NextResponse.json(
        { error: 'Partner is not on the payout track. Upgrade to a referral partner first.' },
        { status: 400 },
      );
    }

    if (!partner.stripeConnectId) {
      return NextResponse.json({ error: 'Partner has no connected Stripe account' }, { status: 400 });
    }

    if (partner.stripeConnectStatus !== 'active') {
      return NextResponse.json({ error: 'Partner Stripe account is not active' }, { status: 400 });
    }

    const placement = await withTenantScope(orgId, (db) =>
      db.placementRecord.findFirst({
        where: {
          id: placementId,
          user: {
            organizationId: orgId,
            partnerReferrals: { some: { partnerId } },
          },
        },
        select: {
          id: true,
          userId: true,
          placedAt: true,
          startDateVerified: true,
          user: {
            select: {
              memberEvents: {
                where: {
                  eventName: 'PARTNER_PAYOUT_SENT',
                  entityType: 'PlacementRecord',
                  entityId: placementId,
                },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      }),
    );

    if (!placement) {
      const notFound = getPlacementPayoutRejection(null) ?? {
        error: 'Placement not found for this partner',
        status: 404 as const,
      };
      return NextResponse.json({ error: notFound.error }, { status: notFound.status });
    }

    const payoutRejection = getPlacementPayoutRejection({
      id: placement.id,
      userId: placement.userId,
      placedAt: placement.placedAt,
      startDateVerified: placement.startDateVerified,
      paidEvent: placement.user.memberEvents[0] ?? null,
    });

    if (payoutRejection) {
      return NextResponse.json({ error: payoutRejection.error }, { status: payoutRejection.status });
    }

    const payoutAmount = getPartnerPlacementPayoutUsd();
    const amountCents = Math.round(payoutAmount * 100);
    const idempotencyKey = buildPartnerPayoutIdempotencyKey(partnerId, placementId);

    const transfer = await createPayoutTransfer(amountCents, partner.stripeConnectId, {
      partnerId,
      placementId,
      triggeredBy: user.id,
    }, idempotencyKey);

    await prisma.memberEvent.create({
      data: {
        userId: placement.userId,
        eventName: 'PARTNER_PAYOUT_SENT',
        entityType: 'PlacementRecord',
        entityId: placementId,
        metadata: {
          partnerId,
          transferId: transfer.id,
          amountCents,
          triggeredBy: user.id,
        },
        sourcePage: '/api/partner/payout',
      },
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
