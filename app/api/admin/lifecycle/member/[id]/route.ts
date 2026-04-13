import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/**
 * Admin lifecycle timeline for a single member.
 *
 * Returns:
 * - User enrollment state (enrolledProgram, enrolledAt, coursesCompleted, etc.)
 * - CourseEnrollment record (if exists)
 * - Drift detection: whether User.enrolledProgram matches CourseEnrollment.programSlug
 * - Full MemberEvent timeline (last 200 events)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;

  const [member, enrollment, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        enrolledAt: true,
        coursesCompleted: true,
        assessmentCompleted: true,
        assessmentCompletedAt: true,
        createdAt: true,
        deletedAt: true,
        placementRecord: {
          select: { employerName: true, jobTitle: true, placedAt: true },
        },
      },
    }),
    prisma.courseEnrollment.findUnique({
      where: { userId: memberId },
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
}
