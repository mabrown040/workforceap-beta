import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const PAYOUT_PER_PLACEMENT = 500;

async function _GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);
    const partners = await withTenantScope(orgId, async (db) => {
      const partnerList = await db.partner.findMany({
        where: { partnerType: 'referral' },
        take: 100,
      });
      const partnerIds = partnerList.map((p) => p.id);
      const [partnerUsers, referrals] = await Promise.all([
        db.partnerUser.findMany({
          where: { partnerId: { in: partnerIds } },
          include: { user: { select: { fullName: true, email: true } } },
        }),
        db.partnerReferral.findMany({
          where: { partnerId: { in: partnerIds } },
          include: {
            member: {
              select: {
                placementRecord: { select: { id: true } },
                courseEnrollments: { select: { id: true } },
              },
            },
          },
        }),
      ]);
      return { partnerList, partnerUsers, referrals };
    });

    const payouts = partners.partnerList.map((p) => {
      const pUsers = partners.partnerUsers.filter((pu) => pu.partnerId === p.id);
      const firstUser = pUsers[0]?.user;
      const pReferrals = partners.referrals.filter((r) => r.partnerId === p.id);
      const referred = pReferrals.length;
      const enrolled = pReferrals.filter(
        (r) => r.member?.courseEnrollments?.length > 0
      ).length;
      const placed = pReferrals.filter((r) => r.member?.placementRecord).length;
      const earned = placed * PAYOUT_PER_PLACEMENT;
      return {
        partnerId: p.id,
        partnerName: firstUser?.fullName || firstUser?.email || p.name,
        referred,
        enrolled,
        placed,
        earned,
        payoutPerPlacement: PAYOUT_PER_PLACEMENT,
      };
    });

    // AUDIT §H-DEP4 / PLAN-2026-Q3 §P4: partner payout reads surface
    // dollar amounts tied to placement outcomes; every read leaves an
    // audit trail. Wrapped so a logging failure never blocks the read.
    await auditLog({
      actorUserId: user.id,
      action: 'admin.export.partner_payouts',
      targetType: 'PartnerPayoutReport',
      metadata: {
        rowCount: payouts.length,
        organizationId: orgId,
        totalEarned: payouts.reduce((sum, p) => sum + p.earned, 0),
        payoutPerPlacement: PAYOUT_PER_PLACEMENT,
      },
    }).catch((err) =>
      console.error('[admin/partner-payouts] audit log failed:', err),
    );

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('/admin/partner-payouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
export const GET = withApiGuc(_GET);
