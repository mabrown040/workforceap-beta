import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getDiscoveredProgram } from '@/lib/content/programs';

/**
 * Decide whether a member has completed a program. The previous version
 * checked `progress.every(p => p.status === 'COMPLETED')`, but CourseProgress
 * only has rows for courses the member has actually touched — so a member
 * who completed 1 of 10 courses would have `progress = [{ COMPLETED }]`,
 * every() == true, and the program would falsely report COMPLETED. Worse,
 * `?status=COMPLETED` would surface in-progress enrollments.
 *
 * Fix: compare the completed-course count to the program's full course
 * count from the catalog. A program is COMPLETED only when every catalog
 * course has a COMPLETED progress row.
 */
function deriveEnrollmentStatus(
  programSlug: string,
  progress: { status: string }[],
): string {
  if (progress.length === 0) return 'NOT_STARTED';
  const discovered = getDiscoveredProgram(programSlug);
  const totalCatalogCourses = discovered?.courses.length ?? 0;
  const completedCount = progress.filter((p) => p.status === 'COMPLETED').length;
  if (totalCatalogCourses > 0 && completedCount >= totalCatalogCourses) {
    return 'COMPLETED';
  }
  if (progress.some((p) => p.status === 'IN_PROGRESS') || completedCount > 0) {
    return 'IN_PROGRESS';
  }
  return 'NOT_STARTED';
}

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: user.id },
      orderBy: { enrolledAt: 'desc' },
      take: 100,
    });

    const progress = await prisma.courseProgress.findMany({
      take: 5000,
      where: {
        userId: user.id,
        programSlug: { in: enrollments.map((e) => e.programSlug) },
      },
    });

    const enrollmentsWithProgress = enrollments.map((enrollment) => {
      const courseProgress = progress.filter(
        (p) => p.programSlug === enrollment.programSlug
      );
      const status = deriveEnrollmentStatus(enrollment.programSlug, courseProgress);
      const overallPercent =
        courseProgress.length > 0
          ? Math.round(
              courseProgress.reduce((sum, p) => sum + p.percentComplete, 0) /
                courseProgress.length
            )
          : 0;

      return {
        ...enrollment,
        status,
        progress: {
          overallPercent,
          courses: courseProgress,
        },
      };
    });

    const filtered = statusFilter
      ? enrollmentsWithProgress.filter((e) => e.status === statusFilter)
      : enrollmentsWithProgress;

    return NextResponse.json({ enrollments: filtered });
  } catch (error) {
    console.error('/member/enrollments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
