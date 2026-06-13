import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: enrollmentId } = await context.params;
  if (!enrollmentId || typeof enrollmentId !== 'string') {
    return NextResponse.json({ error: 'Missing enrollment id' }, { status: 400 });
  }

  const enrollment = await prisma.$transaction((tx) => tx.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, programSlug: true, isPrimary: true },
  }));

  if (!enrollment || enrollment.userId !== user.id) {
    // Don't disclose the row exists for a different user.
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
  }

  if (enrollment.isPrimary) {
    return NextResponse.json({
      ok: true,
      enrollmentId: enrollment.id,
      programSlug: enrollment.programSlug,
      changed: false,
    });
  }

  await prisma.$transaction(async (tx) => {
    // Demote any other primary first; the partial unique index will reject
    // a second isPrimary=true without this.
    await tx.courseEnrollment.updateMany({
      where: {
        userId: user.id,
        isPrimary: true,
        id: { not: enrollment.id },
      },
      data: { isPrimary: false },
    });
    await tx.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { isPrimary: true },
    });
    // Keep User.enrolledProgram aligned with the primary slug so the xAPI
    // pipeline (which still reads User.enrolledProgram) credits against
    // the program the member just promoted to primary.
    await tx.user.update({
      where: { id: user.id },
      data: { enrolledProgram: enrollment.programSlug },
    });
  });

  return NextResponse.json({
    ok: true,
    enrollmentId: enrollment.id,
    programSlug: enrollment.programSlug,
    changed: true,
  });

  } catch (error) {
    console.error('/member/enrollments/[id]/set-primary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

