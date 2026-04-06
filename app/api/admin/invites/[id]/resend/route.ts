import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { checkAdminInviteRateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const INVITE_EXPIRY_DAYS = 7;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { success: rateOk } = await checkAdminInviteRateLimit(user.id);
    if (!rateOk) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 invites per hour. Try again later.' },
        { status: 429 }
      );
    }

    const { id } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: { invitedBy: { select: { fullName: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be resent.' },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired. Create a new invite instead.' },
        { status: 400 }
      );
    }

    const newToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const inviteUrl = `${SITE_URL}/invite?token=${newToken}`;
    const roleLabel =
      invitation.role === 'admin'
        ? 'Admin'
        : invitation.role === 'partner'
          ? 'Partner'
          : invitation.role === 'counselor'
            ? 'Counselor'
            : 'Student';

    // Send email before rotating the token so a failed send does not invalidate the existing link.
    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      inviterName: invitation.invitedBy.fullName.trim() || 'A WorkforceAP admin',
      role: roleLabel,
      personalMessage: invitation.personalMessage,
      inviteUrl,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          error:
            emailResult.error === 'Email not configured'
              ? 'Email is not configured (RESEND_API_KEY). Copy the invite link from the list or configure Resend.'
              : 'Failed to send email. The invitation link was not changed — you can try again.',
          emailSent: false,
        },
        { status: 500 }
      );
    }

    await prisma.invitation.update({
      where: { id },
      data: { token: newToken, expiresAt },
    });

    return NextResponse.json({ ok: true, message: 'Invitation resent.', emailSent: true });
  } catch (error) {
    console.error('[admin/invites/[id]/resend POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
