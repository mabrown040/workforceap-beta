import 'server-only';

import { prisma } from '@/lib/db/prisma';

const STALE_DAYS = 7;

export type StaleTrainingCronResult = {
  enrollmentsChecked: number;
  newlyFlagged: number;
  cleared: number;
  unchangedStale: number;
};

/**
 * Members with `CourseEnrollment` whose per-program `CourseProgress` has not
 * been updated in {@link STALE_DAYS} get `User.staleTrainingDetectedAt` set (once).
 * Cleared when progress is fresh or program appears complete via rollup.
 */
export async function runStaleCourseraTrainingCheck(): Promise<StaleTrainingCronResult> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000);

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { user: { deletedAt: null } },
    select: {
      userId: true,
      programSlug: true,
    },
  });

  let newlyFlagged = 0;
  let cleared = 0;
  let unchangedStale = 0;

  for (const { userId, programSlug } of enrollments) {
    const rollup = await prisma.memberProgramProgress.findUnique({
      where: { userId_programSlug: { userId, programSlug } },
      select: { averagePercent: true },
    });

    const programComplete = rollup != null && rollup.averagePercent >= 100;

    if (programComplete) {
      const res = await prisma.user.updateMany({
        where: { id: userId, staleTrainingDetectedAt: { not: null } },
        data: { staleTrainingDetectedAt: null },
      });
      cleared += res.count;
      continue;
    }

    const agg = await prisma.courseProgress.aggregate({
      where: { userId, programSlug },
      _max: { lastUpdatedAt: true },
    });
    const last = agg._max.lastUpdatedAt;
    const isStale = !last || last < cutoff;

    if (!isStale) {
      const res = await prisma.user.updateMany({
        where: { id: userId, staleTrainingDetectedAt: { not: null } },
        data: { staleTrainingDetectedAt: null },
      });
      cleared += res.count;
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { staleTrainingDetectedAt: true },
    });
    if (user?.staleTrainingDetectedAt) {
      unchangedStale += 1;
      continue;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { staleTrainingDetectedAt: new Date() },
    });
    newlyFlagged += 1;
  }

  return {
    enrollmentsChecked: enrollments.length,
    newlyFlagged,
    cleared,
    unchangedStale,
  };
}
