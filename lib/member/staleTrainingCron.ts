import 'server-only';

import { prisma } from '@/lib/db/prisma';
import {
  getValidatedProgramCompletionSpec,
  isValidatedProgramComplete,
} from '@/lib/reporting/programCompletion';

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

  const enrollmentScopes = Array.from(
    new Map(
      enrollments.map((enrollment) => {
        const spec = getValidatedProgramCompletionSpec(enrollment.programSlug);
        const canonicalProgramSlug = spec?.canonicalSlug ?? enrollment.programSlug;
        return [
          `${enrollment.userId}:${canonicalProgramSlug}`,
          {
            userId: enrollment.userId,
            canonicalProgramSlug,
            storageValues: spec?.storageValues ?? [enrollment.programSlug],
          },
        ] as const;
      }),
    ).values(),
  );
  const enrolledProgramWhere = enrollmentScopes.map((scope) => ({
    userId: scope.userId,
    programSlug: { in: [...scope.storageValues] },
  }));

  // Batch 1: all rollups for enrolled (userId, canonical program) pairs,
  // including historical storage aliases for the same validated curriculum.
  const rollups = await prisma.memberProgramProgress.findMany({
    where: { OR: enrolledProgramWhere },
    select: { userId: true, programSlug: true, coursesCompleted: true },
  });
  const completedProgramKeys = new Set<string>();
  for (const rollup of rollups) {
    const spec = getValidatedProgramCompletionSpec(rollup.programSlug);
    if (spec && isValidatedProgramComplete(rollup.programSlug, rollup.coursesCompleted)) {
      completedProgramKeys.add(`${rollup.userId}:${spec.canonicalSlug}`);
    }
  }

  // Batch 2: max lastUpdatedAt per (userId, stored program value) from courseProgress.
  // Fold aliases back onto their canonical key so a historical slug cannot
  // make otherwise-current activity look stale.
  const progressAgg = await prisma.courseProgress.groupBy({
    by: ['userId', 'programSlug'],
    where: { OR: enrolledProgramWhere },
    _max: { lastUpdatedAt: true },
  });
  const progressMap = new Map<string, Date>();
  for (const progress of progressAgg) {
    const canonicalProgramSlug =
      getValidatedProgramCompletionSpec(progress.programSlug)?.canonicalSlug ?? progress.programSlug;
    const lastUpdatedAt = progress._max.lastUpdatedAt;
    if (!lastUpdatedAt) continue;
    const key = `${progress.userId}:${canonicalProgramSlug}`;
    const prior = progressMap.get(key);
    if (!prior || lastUpdatedAt > prior) progressMap.set(key, lastUpdatedAt);
  }

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
    const spec = getValidatedProgramCompletionSpec(programSlug);
    const key = `${userId}:${spec?.canonicalSlug ?? programSlug}`;
    const programComplete = spec ? completedProgramKeys.has(key) : false;

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
