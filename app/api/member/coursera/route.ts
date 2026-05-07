import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug, getProgramCourseCatalogHealth } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';
import { countCompletedInProgram, getFirstIncompleteCourseIndex } from '@/lib/member/courseraCourseProgress';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true, fullName: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const completedCount = program ? countCompletedInProgram(program, completedSlugs) : 0;
  const currentCourseIndex = program ? getFirstIncompleteCourseIndex(program, completedSlugs) : undefined;
  const currentCourseSlug =
    program && currentCourseIndex != null ? program.courses[currentCourseIndex]?.slug : undefined;
  const catalogHealth = program ? getProgramCourseCatalogHealth(program) : null;

  const readiness = getCourseraReadiness(enrolledProgram);
  const launchUrl = buildCourseraLaunchUrl({
    programSlug: enrolledProgram,
    userId: user.id,
    email: user.email ?? '',
    currentCourseIndex,
    currentCourseSlug,
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
          catalogHealth,
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
}
