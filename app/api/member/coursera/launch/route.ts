import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { getProgramBySlug } from '@/lib/content/programs';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/dashboard/coursera');
    return NextResponse.redirect(loginUrl);
  }

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

  // Learner program URL fix (#95) - typically appended with /auth or similar, but for now we just make sure it's not admin root if we have a template
  const launchUrl =
    buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
      currentCourseIndex,
    }) ?? getCourseraReadiness(enrolledProgram).platformUrl;

  return NextResponse.redirect(launchUrl);
}
