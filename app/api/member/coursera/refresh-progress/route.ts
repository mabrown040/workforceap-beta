import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const POST = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) {
      return NextResponse.json({ error: 'No email on file' }, { status: 400 });
    }
  
    const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: { enrolledProgram: true },
    }));
  
    const enrolledProgram = dbUser?.enrolledProgram ?? null;
    const courseraProgramId = enrolledProgram
      ? DISCOVERED_COURSERA_PROGRAMS[enrolledProgram]?.courseraProgramId
      : undefined;
  
    try {
      const progress = await fetchLearnerProgressFromB4B(user.email, {
        programId: courseraProgramId,
        skipCache: true,
      });
  
      return NextResponse.json({
        refreshedAt: new Date().toISOString(),
        coursesWithProgress: progress.size,
      });
    } catch (error) {
      // Keep the B4B error text (URL, status, token hints) in the server log.
      console.error('[member/coursera/refresh-progress] B4B refresh failed:', error);
      return NextResponse.json(
        { error: 'Unable to refresh your progress from Coursera right now. Please try again in a few minutes.' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('/member/coursera/refresh-progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
