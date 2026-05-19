import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const PATCH = withApiGuc(async (
  request: Request,
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
    const invitation = await prisma.invitation.findFirst({
      where: { id, invitedBy: { organizationId: orgId } },
    });

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
    await prisma.invitation.updateMany({
      where: { id, invitedBy: { organizationId: orgId } },
      data: { status: 'revoked' },
    });

    const profileRole = await getProfileRole(user.id);
    await logAuditEvent({
      user: { id: user.id, role: profileRole ?? undefined },
      verb: 'voided',
      object: { type: 'Invitation', id },
      result: { success: true },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] invite revoke:', err));

    return NextResponse.json({ ok: true, message: 'Invitation revoked.' });
  } catch (error) {
    console.error('[admin/invites/[id]/revoke PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
