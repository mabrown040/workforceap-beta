import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/member/enrollments/{id}/set-primary
 *
 * Marks the given CourseEnrollment row as `isPrimary = true` for the calling
 * user. The partial unique index `course_enrollments_user_primary_uidx`
 * enforces the at-most-one-primary invariant per user, so we demote any
 * other primary first inside a transaction.
 *
 * Multi-program scope: this just toggles which row is primary for the
 * dashboard view. It does NOT switch the user out of any program (the
 * "switch program" UX is queued backlog) and it does NOT change xAPI
 * crediting — that still gates on `User.enrolledProgram` (see
 * lib/xapi/inboundStatementPipeline.ts). To keep the existing pipeline
 * working we keep `User.enrolledProgram` in lockstep with the primary slug.
 *
 * Auth: caller must own the enrollment row.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: enrollmentId } = await context.params;
  if (!enrollmentId || typeof enrollmentId !== 'string') {
    return NextResponse.json({ error: 'Missing enrollment id' }, { status: 400 });
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, programSlug: true, isPrimary: true },
  });

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
}

