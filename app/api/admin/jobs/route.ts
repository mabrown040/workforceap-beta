import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { captureApiError } from '@/lib/observability/captureApiError';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Reference migration for Track A — Tenant Isolation Hardening (Sprint A.1).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * The Prisma `job.findMany` call is wrapped in `withTenantScope(orgId, ...)`
 * which auto-injects `where: { organizationId: orgId }` — so this endpoint
 * is provably scoped to a single tenant. A test in
 * `tests/tenant-isolation.test.ts` (future) asserts the invariant.
 *
 * For now `orgId` resolves via `getActorOrganizationId()` (production is
 * single-tenant). When the multi-tenant resolver lands in Sprint A.2,
 * `orgId` will come from the authenticated user's `User.organizationId`.
 */
async function _GET(request: NextRequest) {
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
}
export const GET = withApiGuc(_GET);
