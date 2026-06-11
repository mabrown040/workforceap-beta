import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPartnerForUser } from '@/lib/auth/roles';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { sendPartnerReferralInviteEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { recordPartnerWorkflowEvent } from '@/lib/portal/workflowEvents';
import { checkAdminInviteRateLimit } from '@/lib/rate-limit';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

const schema = z.object({
  email: z.string().email().max(320).transform((value) => value.toLowerCase().trim()),
  personalMessage: z.string().max(2000).optional().nullable(),
});export const POST = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getPartnerForUser(user.id);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { success } = await checkAdminInviteRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a little while.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { id: ctx.partnerId },
      select: {
        id: true,
        name: true,
        slug: true,
        referralCode: true,
      },
    });
    if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

    const inviter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, email: true },
    });

    const refParam = partner.referralCode ?? partner.slug;
    const inviteUrl = `${SITE_URL}/apply?ref=${encodeURIComponent(refParam)}`;
    const inviterName =
      inviter?.fullName?.trim() || inviter?.email?.trim() || partner.name || 'Your WorkforceAP partner';
    const personalMessage = parsed.data.personalMessage?.trim() || null;

    const emailResult = await sendPartnerReferralInviteEmail({
      to: parsed.data.email,
      inviterName,
      partnerName: partner.name,
      personalMessage,
      inviteUrl,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error ?? 'Invite email failed to send.' },
        { status: 500 }
      );
    }

    try {
      await recordPartnerWorkflowEvent({
        partnerId: partner.id,
        actorUserId: user.id,
        kind: 'member_invite',
        headline: `Invite sent · ${parsed.data.email}`,
        detail: personalMessage,
      });

      await trackEvent({
        userId: user.id,
        eventName: 'partner_invite_sent',
        entityType: 'partner',
        entityId: partner.id,
        metadata: { inviteeEmail: parsed.data.email },
        sourcePage: '/partner/referred-members',
      });
    } catch (error) {
      console.error('[POST /api/partner/invitations] post-send tracking failed', error);
    }

    return NextResponse.json({
      ok: true,
      inviteUrl,
      message: `Invitation sent to ${parsed.data.email}.`,
    });
  } catch (error) {
    console.error('[POST /api/partner/invitations]', error);
    return NextResponse.json(
      { error: 'We could not send that invite right now. Please try again.' },
      { status: 500 }
    );
  }
});
