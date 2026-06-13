import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const postSchema = z.object({
  memberId: z.string().uuid(),
});async function _GET(request: NextRequest) {
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
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
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

    // Reject cross-tenant referrals. Without this, a partner in Org A could
    // claim any member in Org B; the corrupted PartnerReferral row would
    // persist even though loadPartnerReferralBundle hides it from the UI
    // (AUDIT §C-T5).
    const member = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: memberId },
      select: { id: true, fullName: true, organizationId: true },
    }));
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (member.organizationId !== ctx.partner.organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    try {
      const referral = await prisma.$transaction((tx) => tx.partnerReferral.create({
        data: {
          partnerId: ctx.partnerId,
          memberId,
        },
        include: {
          member: { select: { id: true, fullName: true } },
        },
      }));

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
export const POST = withApiGuc(_POST);
