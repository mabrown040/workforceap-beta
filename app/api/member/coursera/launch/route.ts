import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { buildCourseraLaunchUrl, getCourseraReadiness } from '@/lib/coursera/config';

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', '/dashboard/coursera');
    return NextResponse.redirect(loginUrl);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const launchUrl =
    buildCourseraLaunchUrl({
      programSlug: enrolledProgram,
      userId: user.id,
      email: user.email ?? '',
    }) ?? getCourseraReadiness(enrolledProgram).platformUrl;

  return NextResponse.redirect(launchUrl);
}
