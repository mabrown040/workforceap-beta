import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const orgId = await getDefaultOrganizationId();

  const employer = await withTenantScope(orgId, (db) =>
    db.employer.findFirst({ where: { id } }),
  );
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });

  const updated = await withTenantScope(orgId, (db) =>
    db.employer.update({
      where: { id },
      data: { tier: parsed.data.tier },
    }),
  );

  return NextResponse.json({ id: updated.id, tier: updated.tier });
}
