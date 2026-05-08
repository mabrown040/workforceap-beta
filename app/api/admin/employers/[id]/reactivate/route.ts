import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 2).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Both the lookup and the status update against `Employer` are wrapped
 * in `withTenantScope`. An Org A admin can no longer reactivate an Org
 * B employer by guessing its UUID.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: employerId } = await params;
  const orgId = await getDefaultOrganizationId();

  const employer = await withTenantScope(orgId, (db) =>
    db.employer.findFirst({ where: { id: employerId } }),
  );
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
  if (employer.status === 'active') {
    return NextResponse.json({ error: 'Employer is already active' }, { status: 400 });
  }

  await withTenantScope(orgId, (db) =>
    db.employer.update({
      where: { id: employerId },
      data: { status: 'active' },
    }),
  );

  return NextResponse.json({ ok: true, status: 'active' });
}
