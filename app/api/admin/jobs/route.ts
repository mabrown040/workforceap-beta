import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withRouteObservability } from '@/lib/api/routeObservability';export const GET = withRouteObservability(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    const where: { status?: object } = {};
    if (filter === 'pending') where.status = { in: ['pending'] };
    else if (filter === 'live') where.status = { in: ['live'] };
    else if (filter === 'filled') where.status = { in: ['filled', 'closed'] };
    else if (filter === 'draft') where.status = { in: ['draft'] };
    else if (filter === 'approved') where.status = { in: ['approved'] };

    const orgId = await getActorOrganizationId(user.id);
    const jobs = await withTenantScope(orgId, (db) =>
      db.job.findMany({
        where,
        take: 1000,
        orderBy: { updatedAt: 'desc' },
        include: {
          employer: { select: { id: true, companyName: true, contactEmail: true } },
          _count: { select: { applications: true } },
        },
      }),
    );

    const items = jobs.map((j) => ({
      ...j,
      employer: j.employer ?? { id: '', companyName: 'Unknown', contactEmail: '' },
      applicationsCount: j._count?.applications ?? 0,
    }));

    return NextResponse.json(items);
  } catch (error) {
    captureApiError(error, { route: 'admin/jobs GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
