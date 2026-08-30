import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { programSlugsEquivalent } from '@/lib/content/programSlug';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';
import { resolveActiveDashboardProgram } from '@/lib/member/resolveActiveDashboardProgram';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
  const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      fullName: true,
      courseEnrollments: {
        orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
        select: {
          id: true,
          programSlug: true,
          curriculumVersion: true,
          isPrimary: true,
          enrolledAt: true,
        },
      },
      courseProgress: {
        where: { status: 'COMPLETED' },
        select: { programSlug: true, courseSlug: true },
      },
    },
  }));

  const { activeProgramSlug: enrolledProgram } = resolveActiveDashboardProgram({
    enrollments: dbUser?.courseEnrollments ?? [],
    legacyEnrolledProgram: dbUser?.enrolledProgram ?? null,
  });
  const activeEnrollment = dbUser?.courseEnrollments.find((row) =>
    enrolledProgram ? programSlugsEquivalent(row.programSlug, enrolledProgram) : false,
  );
  const curriculumVersion = activeEnrollment?.curriculumVersion ?? 'legacy-v1';
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const assignedCourses = program
    ? getProgramCoursesForCurriculumVersion(program, curriculumVersion)
    : [];
  const assignedCourseSlugs = new Set(assignedCourses.map((course) => course.slug));
  const completedCount = program && enrolledProgram
    ? new Set(
        dbUser?.courseProgress
          .filter(
            (row) =>
              programSlugsEquivalent(row.programSlug, enrolledProgram) &&
              assignedCourseSlugs.has(row.courseSlug),
          )
          .map((row) => row.courseSlug) ?? [],
      ).size
    : 0;

  const readiness = getCourseraReadiness(enrolledProgram);
  const launchUrl = buildCourseraLaunchUrl({
    programSlug: enrolledProgram,
    userId: user.id,
    email: user.email ?? '',
  });

  return NextResponse.json({
    learner: {
      externalUserId: user.id,
      email: user.email ?? '',
      fullName: dbUser?.fullName ?? null,
    },
    program: program
      ? {
          slug: program.slug,
          title: program.title,
          partner: program.partner,
          curriculumVersion,
          totalCourses: assignedCourses.length,
          completedCourses: completedCount,
        }
      : null,
    coursera: {
      launchUrl: launchUrl ?? readiness.platformUrl,
      platformUrl: readiness.platformUrl,
      canLaunch: readiness.canLaunch,
      canSync: readiness.canSync,
      canReceiveWebhooks: readiness.canReceiveWebhooks,
      skillsetCount: readiness.skillsetIds.length,
    },
  });
  } catch {
    return NextResponse.json({ error: 'Failed to load Coursera data' }, { status: 500 });
  }

  } catch (error) {
    console.error('/member/coursera error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

