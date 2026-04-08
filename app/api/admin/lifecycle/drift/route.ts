import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

/**
 * Admin drift detection endpoint.
 *
 * Returns members where User.enrolledProgram and CourseEnrollment.programSlug
 * are out of sync. Two categories:
 *
 * 1. enrolled_no_record: User.enrolledProgram is set but no CourseEnrollment exists
 * 2. slug_mismatch: Both exist but programSlug values differ
 *
 * Limited to 100 results. Used by admin lifecycle audit dashboard.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Find users with enrolledProgram set
  const enrolledUsers = await prisma.user.findMany({
    where: { enrolledProgram: { not: null }, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      enrolledAt: true,
      courseEnrollment: {
        select: { programSlug: true, enrolledAt: true },
      },
    },
    take: 500,
  });

  type DriftRecord = {
    userId: string;
    fullName: string | null;
    email: string;
    driftType: 'enrolled_no_record' | 'slug_mismatch';
    userProgram: string | null;
    enrollmentProgram: string | null;
  };

  const driftRecords: DriftRecord[] = [];

  for (const u of enrolledUsers) {
    if (!u.courseEnrollment) {
      driftRecords.push({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        driftType: 'enrolled_no_record',
        userProgram: u.enrolledProgram,
        enrollmentProgram: null,
      });
    } else if (u.enrolledProgram !== u.courseEnrollment.programSlug) {
      driftRecords.push({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        driftType: 'slug_mismatch',
        userProgram: u.enrolledProgram,
        enrollmentProgram: u.courseEnrollment.programSlug,
      });
    }
  }

  return NextResponse.json({
    total: driftRecords.length,
    records: driftRecords.slice(0, 100),
    checkedAt: new Date().toISOString(),
  });
}
