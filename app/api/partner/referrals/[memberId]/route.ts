import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { recordPartnerWorkflowEvent } from '@/lib/portal/workflowEvents';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const patchSchema = z.object({
  assignedPartnerUserId: z.string().uuid().nullable(),
});export const PATCH = withApiGuc(async (request: NextRequest, ctx: { params: Promise<{ memberId: string }> }) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const partnerCtx = await getPartnerForUser(user.id);
  if (!partnerCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const referral = await prisma.$transaction((tx) => tx.partnerReferral.findUnique({
    where: { partnerId_memberId: { partnerId: partnerCtx.partnerId, memberId } },
    include: { member: { select: { fullName: true } } },
  }));
  if (!referral) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });

  const { assignedPartnerUserId } = parsed.data;
  if (assignedPartnerUserId) {
    const pu = await prisma.$transaction((tx) => tx.partnerUser.findFirst({
      where: { partnerId: partnerCtx.partnerId, userId: assignedPartnerUserId },
    }));
    if (!pu) {
      return NextResponse.json({ error: 'Assignee must be a user on this partner account' }, { status: 400 });
    }
  }

  await prisma.$transaction((tx) => tx.partnerReferral.update({
    where: { id: referral.id },
    data: { assignedPartnerUserId },
  }));

  const assignee = assignedPartnerUserId
    ? await prisma.$transaction((tx) => tx.user.findUnique({
        where: { id: assignedPartnerUserId },
        select: { fullName: true },
      }))
    : null;

  await recordPartnerWorkflowEvent({
    partnerId: partnerCtx.partnerId,
    actorUserId: user.id,
    kind: 'referral_assign',
    headline: assignedPartnerUserId
      ? `Owner → ${assignee?.fullName ?? 'partner user'} · ${referral.member.fullName}`
      : `Owner cleared · ${referral.member.fullName}`,
    entityType: 'PartnerReferral',
    entityId: referral.id,
  });

  return NextResponse.json({ ok: true, assignedPartnerUserId, assignedToName: assignee?.fullName ?? null });

  } catch (error) {
    console.error('/partner/referrals/[memberId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

