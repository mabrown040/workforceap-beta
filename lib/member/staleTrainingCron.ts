import 'server-only';

import { prisma } from '@/lib/db/prisma';
import {
  getValidatedProgramCompletionSpec,
  isValidatedProgramComplete,
} from '@/lib/reporting/programCompletion';

const STALE_DAYS = 7;
const ENROLLMENT_PAGE_SIZE = 500;

type StaleTrainingEnrollment = {
  id: string;
  userId: string;
  programSlug: string;
  curriculumVersion: string;
};

export type StaleTrainingCronResult = {
  enrollmentsChecked: number;
  newlyFlagged: number;
  cleared: number;
  unchangedStale: number;
  reStamped: number;
};

async function loadActiveCourseEnrollments() {
  const enrollments: StaleTrainingEnrollment[] = [];
  let cursorId: string | null = null;

  for (;;) {
    const page: StaleTrainingEnrollment[] = await prisma.courseEnrollment.findMany({
      take: ENROLLMENT_PAGE_SIZE,
      orderBy: { id: 'asc' },
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      where: { user: { deletedAt: null } },
      select: {
        id: true,
        userId: true,
        programSlug: true,
        curriculumVersion: true,
      },
    });
    enrollments.push(...page);

    if (page.length < ENROLLMENT_PAGE_SIZE) break;
    const nextCursorId: string | undefined = page.at(-1)?.id;
    if (!nextCursorId || nextCursorId === cursorId) break;
    cursorId = nextCursorId;
  }

  return enrollments;
}

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

  const enrollments = await loadActiveCourseEnrollments();

  if (enrollments.length === 0) {
    return { enrollmentsChecked: 0, newlyFlagged: 0, cleared: 0, unchangedStale: 0, reStamped: 0 };
  }

  const enrollmentScopes = Array.from(
    new Map(
      enrollments.map((enrollment) => {
        const spec = getValidatedProgramCompletionSpec(
          enrollment.programSlug,
          enrollment.curriculumVersion,
        );
        const canonicalProgramSlug = spec?.canonicalSlug ?? enrollment.programSlug;
        return [
          `${enrollment.userId}:${canonicalProgramSlug}:${enrollment.curriculumVersion}`,
          {
            userId: enrollment.userId,
            canonicalProgramSlug,
            curriculumVersion: enrollment.curriculumVersion,
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
  for (const scope of enrollmentScopes) {
    const completedRollup = rollups.find(
      (rollup) =>
        rollup.userId === scope.userId
        && scope.storageValues.includes(rollup.programSlug)
        && isValidatedProgramComplete(
          rollup.programSlug,
          scope.curriculumVersion,
          rollup.coursesCompleted,
        ),
    );
    if (completedRollup) {
      completedProgramKeys.add(
        `${scope.userId}:${scope.canonicalProgramSlug}:${scope.curriculumVersion}`,
      );
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
  for (const scope of enrollmentScopes) {
    const key = `${scope.userId}:${scope.canonicalProgramSlug}:${scope.curriculumVersion}`;
    for (const progress of progressAgg) {
      if (
        progress.userId !== scope.userId
        || !scope.storageValues.includes(progress.programSlug)
      ) {
        continue;
      }
      const lastUpdatedAt = progress._max.lastUpdatedAt;
      if (!lastUpdatedAt) continue;
      const prior = progressMap.get(key);
      if (!prior || lastUpdatedAt > prior) progressMap.set(key, lastUpdatedAt);
    }
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

  const toClear = new Set<string>();
  const toFlag = new Set<string>();
  // Members already flagged as stale who are still stale: re-stamp so the
  // re-sync cron sees them as pending on every check cycle.
  const toReStamp = new Set<string>();
  const usersWithStaleIncompleteEnrollment = new Set<string>();

  for (const { userId, programSlug, curriculumVersion } of enrollments) {
    const spec = getValidatedProgramCompletionSpec(programSlug, curriculumVersion);
    const key = `${userId}:${spec?.canonicalSlug ?? programSlug}:${curriculumVersion}`;
    const programComplete = spec ? completedProgramKeys.has(key) : false;

    if (programComplete) continue;

    const last = progressMap.get(key);
    const isStale = !last || last < cutoff;
    if (isStale) usersWithStaleIncompleteEnrollment.add(userId);
  }

  // User.staleTrainingDetectedAt is user-level state. Resolve every program
  // first, then choose exactly one action for the member. Any stale incomplete
  // enrollment wins over another enrollment that is fresh or complete.
  for (const userId of userIds) {
    const shouldBeStale = usersWithStaleIncompleteEnrollment.has(userId);
    const alreadyStale = userMap.get(userId);
    if (!shouldBeStale) {
      if (alreadyStale) toClear.add(userId);
      continue;
    }

    if (alreadyStale) {
      // Member is still stale — re-stamp staleTrainingDetectedAt so the
      // downstream re-sync cron keeps picking them up for another sync attempt.
      unchangedStale += 1;
      toReStamp.add(userId);
      continue;
    }

    toFlag.add(userId);
  }

  // Batch 4: clear stale flag where needed
  if (toClear.size > 0) {
    const clearRes = await prisma.user.updateMany({
      where: { id: { in: [...toClear] }, staleTrainingDetectedAt: { not: null } },
      data: { staleTrainingDetectedAt: null },
    });
    cleared = clearRes.count;
  }

  // Batch 5: set stale flag for newly-stale members (only where not yet set)
  if (toFlag.size > 0) {
    const flagRes = await prisma.user.updateMany({
      where: { id: { in: [...toFlag] }, staleTrainingDetectedAt: null },
      data: { staleTrainingDetectedAt: new Date() },
    });
    newlyFlagged = flagRes.count;
  }

  // Batch 6: re-stamp already-stale members so re-sync cron picks them up again
  if (toReStamp.size > 0) {
    const reStampRes = await prisma.user.updateMany({
      where: { id: { in: [...toReStamp] }, staleTrainingDetectedAt: { not: null } },
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
