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

    const programs = await prisma.organizationProgramCatalog.findMany({
      take: 5000,
      where: { organizationId: orgId },
      // Select the slug too — the enrollment + completion sources both key
      // off slugs, while `name` is just for display.
      select: { id: true, name: true, programSlug: true },
    });

    // User.enrolledProgram stores the program slug (not the display name).
    const enrollments = await prisma.user.groupBy({
      by: ['enrolledProgram'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        enrolledProgram: { not: null },
      },
      _count: { id: true },
    });

    // course_enrollments has no `program` or `completed_at` columns — the
    // real columns are `program_slug` + `enrolled_at`. Completion lives in
    // course_progress.status='COMPLETED'. Count distinct users with at
    // least one completed course per program.
    const completions = await prisma.$queryRaw<{ program_slug: string; count: number }[]>`
      SELECT cp.program_slug, COUNT(DISTINCT cp.user_id)::int as count
      FROM course_progress cp
      INNER JOIN users u ON u.id = cp.user_id AND u.organization_id = ${orgId}
      WHERE cp.status = 'COMPLETED'
      GROUP BY cp.program_slug
    `;

    const completionMap = new Map(completions.map((c) => [c.program_slug, c.count]));
    const enrollmentMap = new Map(enrollments.map((e) => [e.enrolledProgram, e._count.id]));

    const stats = programs.map((p) => {
      // Key off slug, not display name — User.enrolledProgram and
      // course_progress.program_slug both store slugs.
      const enrolled = enrollmentMap.get(p.programSlug) ?? 0;
      const completed = completionMap.get(p.programSlug) ?? 0;
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
}
