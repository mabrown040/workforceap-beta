import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withRouteObservability } from '@/lib/api/routeObservability';export const POST = withRouteObservability(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await requireAdmin(user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: employerId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const employer = await withTenantScope(orgId, (db) =>
    db.employer.findFirst({ where: { id: employerId } }),
  );
  if (!employer) return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
  if (employer.status !== 'active') {
    return NextResponse.json({ error: 'Employer is already inactive' }, { status: 400 });
  }

  await withTenantScope(orgId, (db) =>
    db.employer.update({
      where: { id: employerId },
      data: { status: 'inactive' },
    }),
  );

  return NextResponse.json({ ok: true, status: 'inactive' });

  } catch (error) {
    console.error('/admin/employers/[id]/deactivate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

