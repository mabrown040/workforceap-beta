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
    select: { enrolledProgram: true, coursesCompleted: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const completedCount = program
    ? completedSlugs.filter((slug) => program.courses.some((course) => course.slug === slug)).length
    : 0;

  /* Optional ?course=<slug> deep-links to a specific course in the enrolled program. */
  const requestedSlug = new URL(request.url).searchParams.get('course')?.trim() || '';
  const requestedIndex = requestedSlug && program
    ? program.courses.findIndex((c) => c.slug === requestedSlug)
    : -1;

  /* Default = first incomplete course in the enrolled program. */
  const defaultCurrentIndex = program && completedCount < program.courses.length
    ? completedCount
    : undefined;

  const currentCourseIndex = requestedIndex >= 0 ? requestedIndex : defaultCurrentIndex;

  const launchUrl =
    buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
      currentCourseIndex,
    }) ?? getCourseraReadiness(enrolledProgram).platformUrl;

  return NextResponse.redirect(launchUrl);
}
