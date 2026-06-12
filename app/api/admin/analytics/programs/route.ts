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

    const programs = await prisma.organizationProgramCatalog.findMany({
      take: 500,
      where: { organizationId: orgId },
      select: { id: true, name: true },
    });

    const enrollments = await prisma.user.groupBy({
      by: ['enrolledProgram'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        enrolledProgram: { not: null },
      },
      _count: { id: true },
    });

    const completions = await prisma.$queryRaw<{ program: string; count: number }[]>`
      SELECT ce.program as program, COUNT(DISTINCT ce.user_id)::int as count
      FROM course_enrollments ce
      INNER JOIN users u ON u.id = ce.user_id AND u.organization_id = ${orgId}::uuid AND u.deleted_at IS NULL
      WHERE ce.completed_at IS NOT NULL
      GROUP BY ce.program
    `;

    const completionMap = new Map(completions.map((c) => [c.program, c.count]));
    const enrollmentMap = new Map(enrollments.map((e) => [e.enrolledProgram, e._count.id]));

    const stats = programs.map((p: { id: string; name: string }) => {
      const enrolled = enrollmentMap.get(p.name) ?? 0;
      const completed = completionMap.get(p.name) ?? 0;
      return {
        programId: p.id,
        programName: p.name,
        enrolled,
        completed,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
      };
    });

    return NextResponse.json({ programs: stats });
  } catch (error) {
    console.error('/admin/analytics/programs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
