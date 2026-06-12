import { prisma } from '@/lib/db/prisma';

export async function fetchPlacementAnalytics(orgId: string) {
  const placementWhere = { user: { organizationId: orgId, deletedAt: null } };

  const [placements, placementTotal, salaryStats] = await Promise.all([
    prisma.placementRecord.findMany({
      where: placementWhere,
      orderBy: { placedAt: 'desc' },
      take: 500,
      include: {
        user: { select: { fullName: true, email: true, id: true } },
      },
    }),
    prisma.placementRecord.count({
      where: placementWhere,
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
    total: placementTotal,
    avgSalary: Math.round(salaryStats[0]?.avg ?? 0),
    medianSalary: Math.round(salaryStats[0]?.median ?? 0),
    minSalary: Math.round(salaryStats[0]?.min ?? 0),
    maxSalary: Math.round(salaryStats[0]?.max ?? 0),
  };

  return { placements, outcomes };
}
