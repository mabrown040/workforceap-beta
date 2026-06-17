import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, enabled, rolloutPercentage, allowedRoles } = body;

    const existing = await prisma.$transaction((tx) => tx.featureFlag.findUnique({ where: { id } }));
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name?.trim() ?? existing.name;
    if (description !== undefined) update.description = description?.trim() || null;
    if (enabled !== undefined) update.enabled = !!enabled;
    if (rolloutPercentage !== undefined) {
      update.rolloutPercentage = Math.max(0, Math.min(100, Number(rolloutPercentage) || 0));
    }
    if (allowedRoles !== undefined) {
      update.allowedRoles = Array.isArray(allowedRoles)
        ? allowedRoles.filter((r: string) => typeof r === 'string')
        : existing.allowedRoles;
    }

    const flag = await prisma.$transaction((tx) => tx.featureFlag.update({
      where: { id },
      data: update,
    }));

    const orgId = await getActorOrganizationId(user.id).catch(() => null);
    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'update_feature_flag',
      object: { type: 'FeatureFlag', id },
      result: { success: true, extensions: { name: flag.name, enabled: flag.enabled } },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] update_feature_flag:', err));

    return NextResponse.json({ flag });
  } catch (error) {
    console.error('[admin/feature-flags/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);async function _DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.$transaction((tx) => tx.featureFlag.findUnique({ where: { id }, select: { name: true } }));
    await prisma.$transaction((tx) => tx.featureFlag.delete({ where: { id } }));

    const orgId = await getActorOrganizationId(user.id).catch(() => null);
    logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'delete_feature_flag',
      object: { type: 'FeatureFlag', id },
      result: { success: true, extensions: { name: existing?.name ?? id } },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] delete_feature_flag:', err));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/feature-flags/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const DELETE = withApiGuc(_DELETE);
