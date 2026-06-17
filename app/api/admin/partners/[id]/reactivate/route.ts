import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: partnerId } = await params;
  // Partner is tenant-scoped. Wrap so an Org A admin cannot
  // reactivate an Org B partner.
  const orgId = await getActorOrganizationId(user.id);
  const partner = await withTenantScope(orgId, (db) =>
    db.partner.findFirst({ where: { id: partnerId } }),
  );
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  if (partner.active) {
    return NextResponse.json({ error: 'Partner is already active' }, { status: 400 });
  }

  await withTenantScope(orgId, (db) =>
    db.partner.update({
      where: { id: partnerId },
      data: { active: true },
    }),
  );

  await auditLog({
    actorUserId: user.id,
    action: 'partner_reactivate',
    targetType: 'partner',
    targetId: partnerId,
    metadata: { orgId },
  });
  const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
  await logAuditEvent({
    user: { id: user.id, role: actorRole },
    verb: 'approved',
    object: { type: 'Partner', id: partnerId },
    result: { success: true, extensions: { orgId } },
    request: auditRequestMeta(_request),
    orgId,
  }).catch((err) => console.error('[audit] partner reactivate:', err));

  return NextResponse.json({ ok: true, active: true });

  } catch (error) {
    console.error('/admin/partners/[id]/reactivate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

