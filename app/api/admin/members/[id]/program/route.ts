import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const PATCH = withApiGuc(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await requireAdmin(user.id);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const programSlug = typeof o.programSlug === 'string' ? o.programSlug.trim() : '';

  if (!programSlug) {
    return NextResponse.json({ error: 'programSlug required' }, { status: 400 });
  }

  const program = getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.courseProgress.deleteMany({ where: { userId: id } });
    await tx.memberProgramProgress.deleteMany({ where: { userId: id } });

    const member = await tx.user.update({
      where: { id },
      data: {
        enrolledProgram: programSlug,
        programChangedAt: now,
        coursesCompleted: [], // compatibility mirror only; canonical rows were reset above
        enrolledAt: now,
      },
      select: { organizationId: true },
    });
    // Multi-program: admin "set program" picks the user's primary
    // enrollment. Demote any other primary first to satisfy the partial
    // unique index, then upsert this program's row as primary.
    await tx.courseEnrollment.updateMany({
      where: { userId: id, isPrimary: true, programSlug: { not: programSlug } },
      data: { isPrimary: false },
    });
    await tx.courseEnrollment.upsert({
      where: { userId_programSlug: { userId: id, programSlug } },
      create: {
        organizationId: member.organizationId,
        userId: id,
        programSlug,
        isPrimary: true,
        enrolledAt: now,
        enrolledByAdminId: user.id,
      },
      update: {
        isPrimary: true,
        enrolledAt: now,
        enrolledByAdminId: user.id,
      },
    });
  });

  await sendPartnerMilestoneEmail(id, 'Program enrollment', {
    Program: program.title,
  });

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/program error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

