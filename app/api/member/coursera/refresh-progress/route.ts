import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { fetchLearnerProgressFromB4B } from '@/lib/coursera/learnerProgress';

/**
 * Manual cache-bust for `/dashboard/training`. The page render path uses
 * a 60s memo on per-learner B4B progress; this endpoint re-pulls with
 * `skipCache: true` so the next render sees fresh numbers immediately.
 *
 * NB: this route never writes to the DB — that's still the background
 * sync job's responsibility (#1076). All it does is warm the cache so
 * the subsequent server-component render reads up-to-date data.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email) {
    return NextResponse.json({ error: 'No email on file' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { enrolledProgram: true },
  });

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
}
