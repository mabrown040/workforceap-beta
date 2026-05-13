import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

function deriveEnrollmentStatus(progress: { status: string }[]): string {
  if (progress.length === 0) return 'NOT_STARTED';
  if (progress.every((p) => p.status === 'COMPLETED')) return 'COMPLETED';
  if (progress.some((p) => p.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}export const GET = withApiGuc(async (request: Request) => {
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
      const status = deriveEnrollmentStatus(courseProgress);
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
});
