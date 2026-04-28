import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { getProgramBySlug } from '@/lib/content/programs';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { cookies } from 'next/headers';
import { i18n } from '@/next-i18next.config.js';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/dashboard/coursera');
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('i18next')?.value ?? i18n.defaultLocale;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true, coursesCompleted: true, organizationId: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;

  /* Optional ?course=<slug> deep-links to a specific course in the enrolled program. */
  const requestedSlug = new URL(request.url).searchParams.get('course')?.trim() || '';

  if (requestedSlug && enrolledProgram && dbUser?.organizationId) {
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

  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const completedCount = program
    ? completedSlugs.filter((slug) => program.courses.some((c) => c.slug === slug)).length
    : 0;

  const requestedIndex = requestedSlug && program
    ? program.courses.findIndex((c) => c.slug === requestedSlug)
    : -1;

  const defaultCurrentIndex = program && completedCount < program.courses.length
    ? completedCount
    : undefined;

  const currentCourseIndex = requestedIndex >= 0 ? requestedIndex : defaultCurrentIndex;

  // Prefer (1) configured launch URL → (2) the discovered learner program
  // URL for the member's enrolled program → (3) the platform root. The learner
  // program URL drops members into their actual enrollment, not the public
  // Coursera homepage where they have to hunt for it (#95).
  const discoveredProgramUrl = enrolledProgram
    ? DISCOVERED_COURSERA_PROGRAMS[enrolledProgram]?.publicProgramUrl ?? null
    : null;

  const launchUrl =
    buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
      currentCourseIndex,
      locale,
    }) ??
    discoveredProgramUrl ??
    getCourseraReadiness(enrolledProgram).platformUrl;

  return NextResponse.redirect(launchUrl);
}
