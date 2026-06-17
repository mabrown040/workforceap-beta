import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';

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
      courseProgress: {
        where: { status: 'COMPLETED' },
        select: { programSlug: true, courseSlug: true },
      },
    },
  }));

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedCount = program && enrolledProgram
    ? dbUser?.courseProgress.filter((row) => row.programSlug === enrolledProgram && program.courses.some((course) => course.slug === row.courseSlug)).length ?? 0
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
          totalCourses: program.courses.length,
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

