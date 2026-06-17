import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  // Tenant scope: an Org A admin cannot read the lifecycle/program/
  // event-history of an Org B member by guessing their UUID.
  const orgId = await getActorOrganizationId(user.id);

  const [member, enrollment, events] = await Promise.all([
    prisma.user.findFirst({
      where: { id: memberId, organizationId: orgId },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        enrolledAt: true,
        memberProgramProgress: {
          select: { programSlug: true, coursesCompleted: true, averagePercent: true, lastUpdatedAt: true },
        },
        courseProgress: {
          where: { status: 'COMPLETED' },
          select: { programSlug: true, courseSlug: true, completedAt: true, lastUpdatedAt: true },
        },
        assessmentCompleted: true,
        assessmentCompletedAt: true,
        createdAt: true,
        deletedAt: true,
        placementRecord: {
          select: { employerName: true, jobTitle: true, placedAt: true },
        },
      },
    }),
    // Multi-program: pick the primary enrollment for the lifecycle view.
    // Other (secondary) enrollments are intentionally not shown here; the
    // member detail page surfaces them. See prisma/migrations/.../multi_course_enrollment.
    prisma.courseEnrollment.findFirst({
      where: { userId: memberId, isPrimary: true },
      select: {
        programSlug: true,
        enrolledAt: true,
        enrolledByAdminId: true,
        fundingSource: true,
      },
    }),
    prisma.memberEvent.findMany({
      where: { userId: memberId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        eventName: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Drift detection: compare User.enrolledProgram vs CourseEnrollment.programSlug
  const drift = {
    hasDrift: false,
    detail: null as string | null,
  };
  if (member.enrolledProgram && !enrollment) {
    drift.hasDrift = true;
    drift.detail = `User.enrolledProgram="${member.enrolledProgram}" but no CourseEnrollment record exists`;
  } else if (!member.enrolledProgram && enrollment) {
    drift.hasDrift = true;
    drift.detail = `CourseEnrollment.programSlug="${enrollment.programSlug}" but User.enrolledProgram is null`;
  } else if (member.enrolledProgram && enrollment && member.enrolledProgram !== enrollment.programSlug) {
    drift.hasDrift = true;
    drift.detail = `User.enrolledProgram="${member.enrolledProgram}" !== CourseEnrollment.programSlug="${enrollment.programSlug}"`;
  }

  return NextResponse.json({
    member,
    enrollment,
    drift,
    events,
    eventCount: events.length,
  });

  } catch (error) {
    console.error('/admin/lifecycle/member/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

