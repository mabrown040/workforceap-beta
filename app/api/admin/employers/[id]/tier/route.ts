import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 2).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Both the lookup and the tier update against `Employer` are wrapped
 * in `withTenantScope`. An Org A admin can no longer change tier on
 * an Org B employer by guessing its UUID.
 */

const tierSchema = z.object({
  tier: z.enum(['basic', 'partner']),
});

async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const orgId = await getActorOrganizationId(user.id);

  const employer = await withTenantScope(orgId, (db) =>
    db.employer.findFirst({ where: { id } }),
  );
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });

  const previousTier = employer.tier;
  const nextTier = parsed.data.tier;

  const updated = await withTenantScope(orgId, (db) =>
    db.employer.update({
      where: { id },
      data: { tier: nextTier },
    }),
  );

  if (previousTier !== nextTier) {
    await auditLog({
      actorUserId: user.id,
      action: 'employer_tier_change',
      targetType: 'employer',
      targetId: id,
      metadata: { orgId, previousTier, nextTier },
    });
    const actorRole = (await isSuperAdmin(user.id)) ? 'super_admin' : 'admin';
    await logAuditEvent({
      user: { id: user.id, role: actorRole },
      verb: 'updated',
      object: { type: 'Employer', id },
      result: { success: true, extensions: { orgId, previousTier, nextTier } },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[audit] employer tier change:', err));
  }

  return NextResponse.json({ id: updated.id, tier: updated.tier });

  } catch (error) {
    console.error('/admin/employers/[id]/tier error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
