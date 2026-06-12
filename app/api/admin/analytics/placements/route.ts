import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);

    const [placements, salaryStats] = await Promise.all([
      prisma.placementRecord.findMany({
        where: { user: { organizationId: orgId, deletedAt: null } },
        orderBy: { placedAt: 'desc' },
        take: 500,
        include: {
          user: { select: { fullName: true, email: true, id: true } },
        },
      }),
      prisma.$queryRaw<{
        avg: number | null;
        median: number | null;
        min: number | null;
        max: number | null;
      }[]>`
        SELECT
          AVG(pr.salary_offered)::float as avg,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pr.salary_offered)::float as median,
          MIN(pr.salary_offered)::float as min,
          MAX(pr.salary_offered)::float as max
        FROM placement_records pr
        INNER JOIN users u ON u.id = pr.user_id AND u.organization_id = ${orgId}::uuid AND u.deleted_at IS NULL
        WHERE pr.salary_offered IS NOT NULL
      `,
    ]);

    const outcomes = {
      total: placements.length,
      avgSalary: Math.round(salaryStats[0]?.avg ?? 0),
      medianSalary: Math.round(salaryStats[0]?.median ?? 0),
      minSalary: Math.round(salaryStats[0]?.min ?? 0),
      maxSalary: Math.round(salaryStats[0]?.max ?? 0),
    };

    return NextResponse.json({ placements, outcomes });
  } catch (error) {
    console.error('/admin/analytics/placements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
