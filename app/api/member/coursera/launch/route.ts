import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraConfig, getCourseraReadiness } from '@/lib/coursera/config';
import { getProgramBySlug } from '@/lib/content/programs';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getFirstIncompleteCourseIndex } from '@/lib/member/courseraCourseProgress';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/dashboard/training');
    return NextResponse.redirect(loginUrl);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      enrolledProgram: true,
      organizationId: true,
      courseProgress: {
        where: { status: 'COMPLETED' },
        select: { programSlug: true, courseSlug: true },
      },
    },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;

  /* Optional ?course=<slug> deep-links to a specific course in the enrolled program. */
  const requestedSlug = new URL(request.url).searchParams.get('course')?.trim() || '';

  if (requestedSlug && enrolledProgram) {
    // Prefer DB override first (org-configured course URL type / slug)
    if (dbUser?.organizationId) {
      const course = await prisma.course.findUnique({
        where: {
          organizationId_programSlug_courseSlug: {
            organizationId: dbUser.organizationId,
            programSlug: enrolledProgram,
            courseSlug: requestedSlug,
          }
        }
      });

      if (course && course.courseraSlug) {
        const urlType = course.courseraUrlType || 'learn';
        return NextResponse.redirect(`https://www.coursera.org/${urlType}/${course.courseraSlug}`);
      }
    }

    // Fallback: construct enterprise deep link from discovered catalog
    const discoveredProg = DISCOVERED_COURSERA_PROGRAMS[enrolledProgram];
    if (discoveredProg) {
      const discoveredCourse = discoveredProg.courses.find((c) => c.slug === requestedSlug);
      if (discoveredCourse) {
        const programSlugFromUrl = (discoveredProg.publicProgramUrl ?? '').match(/\/programs\/([^/?#]+)/)?.[1];
        if (programSlugFromUrl) {
          return NextResponse.redirect(
            `https://www.coursera.org/programs/${programSlugFromUrl}/learn/${discoveredCourse.slug}`
          );
        }
        // If URL parse fails, fall through to public learn URL
        return NextResponse.redirect(`https://www.coursera.org/learn/${discoveredCourse.slug}`);
      }
    }
  }

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = enrolledProgram
    ? dbUser?.courseProgress
        .filter((row) => row.programSlug === enrolledProgram)
        .map((row) => row.courseSlug) ?? []
    : [];

  const requestedIndex = requestedSlug && program
    ? program.courses.findIndex((c) => c.slug === requestedSlug)
    : -1;

  const defaultCurrentIndex = program
    ? getFirstIncompleteCourseIndex(program, completedSlugs)
    : undefined;

  const currentCourseIndex = requestedIndex >= 0 ? requestedIndex : defaultCurrentIndex;

  const courseIdMap = enrolledProgram ? getCourseraConfig().courseIdMap[enrolledProgram] : undefined;
  const currentCourseId =
    courseIdMap && currentCourseIndex != null && currentCourseIndex >= 0
      ? courseIdMap[currentCourseIndex]
      : undefined;

  // Prefer (1) a configured deep link when it is clearly program/course-specific,
  // then (2) the discovered learner program URL for the member's actual
  // enrollment, then (3) the generic Coursera platform root. This avoids
  // dropping members on a broad homepage or admin landing when we know their
  // enrolled learner program URL (#95).
  const discoveredProgramUrl = enrolledProgram
    ? DISCOVERED_COURSERA_PROGRAMS[enrolledProgram]?.publicProgramUrl ?? null
    : null;

  const configuredLaunchUrl = buildCourseraLaunchUrl({
    programSlug: enrolledProgram,
    userId: user.id,
    email: user.email ?? '',
    currentCourseIndex,
    currentCourseId,
  });

  const readiness = getCourseraReadiness(enrolledProgram);
  const isProgramSpecificLaunchUrl = (url: string | null | undefined) => {
    if (!url) return false;
    return /\/programs\//.test(url) || /\/learn\//.test(url) || /\/professional-certificates\//.test(url);
  };

  const resolvedUrl =
    (isProgramSpecificLaunchUrl(configuredLaunchUrl) ? configuredLaunchUrl : null) ??
    discoveredProgramUrl ??
    configuredLaunchUrl ??
    null;

  if (!resolvedUrl) {
    const errorUrl = new URL('/dashboard/training', request.url);
    errorUrl.searchParams.set('error', 'launch_failed');
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(resolvedUrl);
}
