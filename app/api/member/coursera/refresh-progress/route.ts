import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async () => {
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
      const message = error instanceof Error ? error.message : 'Unable to refresh from Coursera';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    console.error('/member/coursera/refresh-progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
