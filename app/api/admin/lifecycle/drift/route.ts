import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
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
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Tenant scope: super-admins see drift across the platform; tenant admins
  // only see members in their own organization. Without this filter a non-
  // super tenant admin would see member emails + program slugs across every
  // tenant on the platform.
  let orgFilterId: string | null = null;
  if (!(await isSuperAdmin(user.id))) {
    try {
      orgFilterId = await getActorOrganizationId(user.id);
    } catch {
      return NextResponse.json({ drift: [], totalScanned: 0 });
    }
  }

  // Find users with enrolledProgram set. Multi-program: drift now compares
  // User.enrolledProgram against the user's *primary* CourseEnrollment row
  // (the one with isPrimary = true). Secondary enrollments are not a drift
  // signal — a user can legitimately be enrolled in IT Support (primary) +
  // Cybersecurity (secondary). Prisma findMany with a filtered relation
  // returns at most one row because of the partial unique index.
  const enrolledUsers = await prisma.user.findMany({
    where: {
      enrolledProgram: { not: null },
      deletedAt: null,
      ...(orgFilterId ? { organizationId: orgFilterId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      enrolledAt: true,
      courseEnrollments: {
        where: { isPrimary: true },
        select: { programSlug: true, enrolledAt: true },
        take: 1,
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
    const primary = u.courseEnrollments[0] ?? null;
    if (!primary) {
      driftRecords.push({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        driftType: 'enrolled_no_record',
        userProgram: u.enrolledProgram,
        enrollmentProgram: null,
      });
    } else if (u.enrolledProgram !== primary.programSlug) {
      driftRecords.push({
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        driftType: 'slug_mismatch',
        userProgram: u.enrolledProgram,
        enrollmentProgram: primary.programSlug,
      });
    }
  }

  return NextResponse.json({
    total: driftRecords.length,
    records: driftRecords.slice(0, 100),
    checkedAt: new Date().toISOString(),
  });

  } catch (error) {
    console.error('/admin/lifecycle/drift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

