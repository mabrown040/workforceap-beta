import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const PATCH = withApiGuc(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Invitation has no `organizationId` column but is FK-bound to
    // the issuing user (`invitedById`). An Org A admin can only revoke
    // invitations sent by users in their own org.
    const orgId = await getActorOrganizationId(user.id);
    const invitation = await prisma.$transaction((tx) => tx.invitation.findFirst({
      where: { id, invitedBy: { organizationId: orgId } },
    }));

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be revoked.' },
        { status: 400 }
      );
    }

    // updateMany so the FK-gated where clause is honored on the write.
    await prisma.$transaction((tx) => tx.invitation.updateMany({
      where: { id, invitedBy: { organizationId: orgId } },
      data: { status: 'revoked' },
    }));

    await auditLog({
      actorUserId: user.id,
      action: 'invitation_revoke',
      targetType: 'invitation',
      targetId: id,
      metadata: { orgId },
    });
    const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: user.id, role: actorRole },
      verb: 'voided',
      object: { type: 'Invitation', id },
      result: { success: true, extensions: { orgId } },
      request: auditRequestMeta(_request),
      orgId,
    }).catch((err) => console.error('[audit] invitation revoke:', err));

    return NextResponse.json({ ok: true, message: 'Invitation revoked.' });
  } catch (error) {
    console.error('[admin/invites/[id]/revoke PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
