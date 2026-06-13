import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { checkAdminInviteRateLimit } from '@/lib/rate-limit';
import { sendInvitationEmail } from '@/lib/email';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { randomBytes } from 'crypto';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const INVITE_EXPIRY_DAYS = 7;export const POST = withApiGuc(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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

    // Tenant-scope the lookup so an Org A admin can't rotate the token
    // on an Org B invitation (AUDIT §H-T1). Mirrors the existing scope
    // already in place on the sibling /revoke route. Super-admins bypass.
    const actorIsSuperAdmin = await isSuperAdmin(user.id);
    let actorOrgId: string | null = null;
    if (!actorIsSuperAdmin) {
      try {
        actorOrgId = await getActorOrganizationId(user.id);
      } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const invitation = await prisma.$transaction((tx) => tx.invitation.findFirst({
      where: actorIsSuperAdmin
        ? { id }
        : { id, invitedBy: { organizationId: actorOrgId! } },
      include: { invitedBy: { select: { fullName: true } } },
    }));

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

    const previousToken = invitation.token;
    const previousExpiresAt = invitation.expiresAt;

    // Persist new token before emailing so the message never contains a token that is not in the DB.
    await prisma.$transaction((tx) => tx.invitation.update({
      where: { id },
      data: { token: newToken, expiresAt },
    }));

    const orgId = await getActorOrganizationId(user.id);
    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      inviterName: invitation.invitedBy.fullName.trim() || 'A WorkforceAP admin',
      role: roleLabel,
      personalMessage: invitation.personalMessage,
      inviteUrl,
      orgId,
    });

    if (!emailResult.ok) {
      try {
        await prisma.$transaction((tx) => tx.invitation.update({
          where: { id },
          data: { token: previousToken, expiresAt: previousExpiresAt },
        }));
      } catch (revertErr) {
        console.error('[admin/invites resend] failed to revert token after email failure:', revertErr);
      }
      return NextResponse.json(
        {
          error:
            emailResult.error === 'Email not configured'
              ? 'Email is not configured (RESEND_API_KEY). Copy the invite link from the list or configure Resend.'
              : 'Failed to send email. The previous invitation link is still valid — try again.',
          emailSent: false,
        },
        { status: 500 }
      );
    }

    await auditLog({
      actorUserId: user.id,
      action: 'invitation_resend',
      targetType: 'invitation',
      targetId: id,
      metadata: { orgId, role: invitation.role, email: invitation.email },
    });
    const actorRole = actorIsSuperAdmin ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: user.id, role: actorRole },
      verb: 'shared',
      object: { type: 'Invitation', id },
      orgId,
      request: auditRequestMeta(request),
    });

    return NextResponse.json({ ok: true, message: 'Invitation resent.', emailSent: true });
  } catch (error) {
    console.error('[admin/invites/[id]/resend POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
