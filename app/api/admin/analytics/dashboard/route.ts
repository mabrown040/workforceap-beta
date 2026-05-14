import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orgId = await getActorOrganizationId(user.id);

    const [
      totalMembers,
      enrolledMembers,
      assessmentCompleted,
      placementsCount,
      avgSalaryResult,
    ] = await Promise.all([
      prisma.user.count({
        where: { deletedAt: null, organizationId: orgId },
      }),
      prisma.user.count({
        where: { deletedAt: null, organizationId: orgId, enrolledProgram: { not: null } },
      }),
      prisma.user.count({
        where: { deletedAt: null, organizationId: orgId, assessmentCompleted: true },
      }),
      prisma.placementRecord.count({
        where: { user: { organizationId: orgId } },
      }),
      prisma.$queryRaw<{ avg: number | null }[]>`
        SELECT AVG(pr.salary_offered)::float as avg
        FROM placement_records pr
        INNER JOIN users u ON u.id = pr.user_id AND u.organization_id = ${orgId}::uuid
        WHERE pr.salary_offered IS NOT NULL
      `,
    ]);

    const completionRate = totalMembers > 0 ? Math.round((assessmentCompleted / totalMembers) * 100) : 0;
    const placementRate = enrolledMembers > 0 ? Math.round((placementsCount / enrolledMembers) * 100) : 0;

    return NextResponse.json({
      totalMembers,
      enrolledMembers,
      assessmentCompleted,
      completionRate,
      placementsCount,
      placementRate,
      avgPlacementSalary: Math.round(avgSalaryResult[0]?.avg ?? 0),
    });
  } catch (error) {
    console.error('/admin/analytics/dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
