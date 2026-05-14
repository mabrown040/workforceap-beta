import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

const PAYOUT_PER_PLACEMENT = 500;

export async function GET(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = await getActorOrganizationId(user.id);
  const partners = await withTenantScope(orgId, async (db) =>
    db.partner.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        referrals: {
          include: {
            member: {
              select: {
                placementRecord: { select: { id: true } },
                courseEnrollments: { select: { id: true } },
              },
            },
          },
        },
      },
      take: 100,
    })
  );

  const payouts = partners.map((p) => {
    const referred = p.referrals.length;
    const enrolled = p.referrals.filter((r) => r.member?.courseEnrollments?.length > 0).length;
    const placed = p.referrals.filter((r) => r.member?.placementRecord).length;
    const earned = placed * PAYOUT_PER_PLACEMENT;
    return {
      partnerId: p.id,
      partnerName: p.user?.fullName || p.user?.email,
      referred,
      enrolled,
      placed,
      earned,
      payoutPerPlacement: PAYOUT_PER_PLACEMENT,
    };
  });

  return NextResponse.json({ payouts });

  } catch (error) {
    console.error('/admin/partner-payouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

