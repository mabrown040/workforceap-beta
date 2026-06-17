import 'server-only';

import { prisma } from '@/lib/db/prisma';

const STALE_DAYS = 7;

export type StaleTrainingCronResult = {
  enrollmentsChecked: number;
  newlyFlagged: number;
  cleared: number;
  unchangedStale: number;
  reStamped: number;
};

/**
 * Members with `CourseEnrollment` whose per-program `CourseProgress` has not
 * been updated in {@link STALE_DAYS} get `User.staleTrainingDetectedAt` set (once).
 * Cleared when progress is fresh or program appears complete via rollup.
 * Already-stale members get their timestamp re-stamped each run so the
 * re-sync cron sees them as still needing attention.
 *
 * Batched query version: replaces per-enrollment N+1 with 4-6 total queries.
 */
export async function runStaleCourseraTrainingCheck(): Promise<StaleTrainingCronResult> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000);

  const enrollments = await prisma.courseEnrollment.findMany({
    take: 500,
    where: { user: { deletedAt: null } },
    select: {
      userId: true,
      programSlug: true,
    },
  });

  if (enrollments.length === 0) {
    return { enrollmentsChecked: 0, newlyFlagged: 0, cleared: 0, unchangedStale: 0, reStamped: 0 };
  }

  // Batch 1: all rollups for enrolled (userId, programSlug) pairs
  const rollups = await prisma.memberProgramProgress.findMany({
    where: {
      OR: enrollments.map((e) => ({
        userId: e.userId,
        programSlug: e.programSlug,
      })),
    },
    select: { userId: true, programSlug: true, averagePercent: true },
  });
  const rollupMap = new Map(
    rollups.map((r) => [`${r.userId}:${r.programSlug}`, r.averagePercent]),
  );

  // Batch 2: max lastUpdatedAt per (userId, programSlug) from courseProgress
  const progressAgg = await prisma.courseProgress.groupBy({
    by: ['userId', 'programSlug'],
    where: {
      OR: enrollments.map((e) => ({
        userId: e.userId,
        programSlug: e.programSlug,
      })),
    },
    _max: { lastUpdatedAt: true },
  });
  const progressMap = new Map(
    progressAgg.map((g) => [
      `${g.userId}:${g.programSlug}`,
      g._max.lastUpdatedAt,
    ]),
  );

  // Batch 3: staleTrainingDetectedAt for all enrolled users
  const userIds = [...new Set(enrollments.map((e) => e.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, staleTrainingDetectedAt: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.staleTrainingDetectedAt]));

  let newlyFlagged = 0;
  let cleared = 0;
  let unchangedStale = 0;
  let reStamped = 0;

  const toClear: string[] = [];
  const toFlag: string[] = [];
  // Members already flagged as stale who are still stale: re-stamp so the
  // re-sync cron sees them as pending on every check cycle.
  const toReStamp: string[] = [];

  for (const { userId, programSlug } of enrollments) {
    const key = `${userId}:${programSlug}`;
    const averagePercent = rollupMap.get(key);
    const programComplete = averagePercent != null && averagePercent >= 100;

    if (programComplete) {
      toClear.push(userId);
      continue;
    }

    const last = progressMap.get(key);
    const isStale = !last || last < cutoff;

    if (!isStale) {
      toClear.push(userId);
      continue;
    }

    const alreadyStale = userMap.get(userId);
    if (alreadyStale) {
      // Member is still stale — re-stamp staleTrainingDetectedAt so the
      // downstream re-sync cron keeps picking them up for another sync attempt.
      unchangedStale += 1;
      toReStamp.push(userId);
      continue;
    }

    toFlag.push(userId);
  }

  // Batch 4: clear stale flag where needed
  if (toClear.length > 0) {
    const uniqueToClear = [...new Set(toClear)];
    const clearRes = await prisma.user.updateMany({
      where: { id: { in: uniqueToClear }, staleTrainingDetectedAt: { not: null } },
      data: { staleTrainingDetectedAt: null },
    });
    cleared = clearRes.count;
  }

  // Batch 5: set stale flag for newly-stale members (only where not yet set)
  if (toFlag.length > 0) {
    const uniqueToFlag = [...new Set(toFlag)];
    const flagRes = await prisma.user.updateMany({
      where: { id: { in: uniqueToFlag }, staleTrainingDetectedAt: null },
      data: { staleTrainingDetectedAt: new Date() },
    });
    newlyFlagged = flagRes.count;
  }

  // Batch 6: re-stamp already-stale members so re-sync cron picks them up again
  if (toReStamp.length > 0) {
    const uniqueToReStamp = [...new Set(toReStamp)];
    const reStampRes = await prisma.user.updateMany({
      where: { id: { in: uniqueToReStamp }, staleTrainingDetectedAt: { not: null } },
      data: { staleTrainingDetectedAt: new Date() },
    });
    reStamped = reStampRes.count;
  }

  return {
    enrollmentsChecked: enrollments.length,
    newlyFlagged,
    cleared,
    unchangedStale,
    reStamped,
  };
}
