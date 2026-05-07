import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraReadiness, resolveCourseraPublicProgramUrl } from '@/lib/coursera/config';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { getProgramBySlug } from '@/lib/content/programs';
import { getFirstIncompleteCourseIndex } from '@/lib/member/courseraCourseProgress';

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

  if (!enrolledProgram || !program) {
    const programUrl = new URL('/dashboard/program', request.url);
    return NextResponse.redirect(programUrl);
  }

  const completedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const currentCourseIndex = getFirstIncompleteCourseIndex(program, completedSlugs);
  const currentCourseSlug = program.courses[currentCourseIndex]?.slug;

  const launchUrl =
    buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
      currentCourseIndex,
      currentCourseSlug,
    }) ??
    resolveCourseraPublicProgramUrl(enrolledProgram) ??
    getCourseraReadiness(enrolledProgram).platformUrl;

  return NextResponse.redirect(launchUrl);
}
