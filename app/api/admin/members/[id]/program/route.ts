import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getProgramBySlug } from '@/lib/content/programs';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { invalidateMemberState } from '@/lib/member/getMemberState';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';

export const PATCH = withApiGuc(async (
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

  // Tenant scope: an Org A admin cannot change program enrollment on
  // an Org B member by guessing their UUID.
  const orgId = await getActorOrganizationId(user.id);
  const target = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  }));
  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.courseProgress.deleteMany({ where: { userId: id, programSlug } });
    await tx.memberProgramProgress.deleteMany({ where: { userId: id, programSlug } });

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

  // Invalidate cached member state so dashboard reflects program change immediately
  await invalidateMemberState(id);

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/admin/members/[id]/program error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
