import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing enrollment id' }, { status: 400 });
    }

    const enrollment = await prisma.$transaction((tx) => tx.courseEnrollment.findUnique({
      where: { id },
    }));

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    if (enrollment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const courseProgress = await prisma.$transaction((tx) => tx.courseProgress.findMany({
      take: 500,
      where: {
        userId: user.id,
        programSlug: enrollment.programSlug,
      },
    }));

    return NextResponse.json({
      enrollment: {
        ...enrollment,
        courseProgress,
      },
    });
  } catch (error) {
    console.error('/member/enrollments/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
