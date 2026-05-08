import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';
const patchSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  adminNote: z.string().max(4000).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.programChangeRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, enrolledProgram: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 });
  }

  const nextStatus = parsed.data.status;

  await prisma.$transaction(async (tx) => {
    await tx.programChangeRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        adminNote: parsed.data.adminNote ?? null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    if (nextStatus === 'APPROVED') {
      await tx.user.update({
        where: { id: existing.userId },
        data: { enrolledProgram: existing.requestedProgramSlug },
      });

      // INVARIANT: CourseEnrollment must stay in sync with User.enrolledProgram.
      // When a program change is approved, update CourseEnrollment to reflect the
      // new program. Use upsert in case CourseEnrollment was never created (legacy data).
      const memberForOrg = await tx.user.findUnique({
        where: { id: existing.userId },
        select: { organizationId: true },
      });
      if (memberForOrg) {
        // Multi-program: a program-change request flips the user's primary
        // enrollment to the requested program. Demote any other primary
        // first (the partial unique index `course_enrollments_user_primary_uidx`
        // allows only one). Then upsert the requested-slug row as primary.
        await tx.courseEnrollment.updateMany({
          where: {
            userId: existing.userId,
            isPrimary: true,
            programSlug: { not: existing.requestedProgramSlug },
          },
          data: { isPrimary: false },
        });
        await tx.courseEnrollment.upsert({
          where: {
            userId_programSlug: {
              userId: existing.userId,
              programSlug: existing.requestedProgramSlug,
            },
          },
          create: {
            organizationId: memberForOrg.organizationId,
            userId: existing.userId,
            programSlug: existing.requestedProgramSlug,
            isPrimary: true,
            enrolledAt: new Date(),
            enrolledByAdminId: user.id,
          },
          update: {
            isPrimary: true,
            enrolledByAdminId: user.id,
          },
        });
      }
    }
  });

  // Lifecycle event for approved program changes
  if (nextStatus === 'APPROVED') {
    trackEvent({
      userId: existing.userId,
      eventName: 'program_change_approved',
      entityType: 'ProgramChangeRequest',
      entityId: id,
      metadata: {
        from: existing.currentProgramSlug,
        to: existing.requestedProgramSlug,
        approvedBy: user.id,
      },
    }).catch(() => {});
  }

  const updated = await prisma.programChangeRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true, enrolledProgram: true } },
      reviewedBy: { select: { id: true, email: true, fullName: true } },
    },
  });

  return NextResponse.json({ request: updated });
}
