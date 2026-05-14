import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';

const postSchema = z.object({
  memberId: z.string().uuid(),
});

/** GET /api/partner/referrals
 *  Returns referral list with status.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const { pipelineMembers } = await loadPartnerReferralBundle(
      ctx.partnerId,
      ctx.partner.organizationId,
    );

    let rows = pipelineMembers.map((p) => ({
      memberId: p.member.id,
      fullName: p.member.fullName,
      stage: p.stage,
      progress: p.progress,
      programTitle: p.programTitle,
      referredAt: p.referredAt.toISOString(),
    }));

    if (statusFilter) {
      rows = rows.filter((r) => r.stage === statusFilter);
    }

    return NextResponse.json({ referrals: rows });
  } catch (error) {
    console.error('/partner/referrals GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/partner/referrals
 *  Creates a new referral linking a member to this partner.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const { memberId } = parsed.data;

    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, fullName: true, organizationId: true, deletedAt: true },
    });
    // Tenant scope: only members in the partner's own organization can be
    // referred. Returning a 404 (rather than 403) for cross-tenant members
    // is intentional — it avoids leaking the existence of users in other
    // tenants by id-probe. Soft-deleted users are also masked as 404 for
    // the same reason.
    if (
      !member ||
      member.deletedAt ||
      member.organizationId !== ctx.partner.organizationId
    ) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    try {
      const referral = await prisma.partnerReferral.create({
        data: {
          partnerId: ctx.partnerId,
          memberId,
        },
        include: {
          member: { select: { id: true, fullName: true } },
        },
      });

      return NextResponse.json({
        id: referral.id,
        partnerId: referral.partnerId,
        memberId: referral.memberId,
        referredAt: referral.referredAt.toISOString(),
      }, { status: 201 });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'Referral already exists for this member' }, { status: 409 });
      }
      throw e;
    }
  } catch (error) {
    console.error('/partner/referrals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
