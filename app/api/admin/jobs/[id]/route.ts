import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const orgId = await getActorOrganizationId(user.id);
    const job = await withTenantScope(orgId, (db) =>
      db.job.findFirst({
        where: { id },
        include: {
          employer: { select: { id: true, companyName: true, contactEmail: true, contactName: true } },
          applications: {
            include: { student: { select: { id: true, fullName: true, email: true } } },
          },
        },
      }),
    );

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(job);
  } catch (error) {
    console.error('[admin/jobs/[id] GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
