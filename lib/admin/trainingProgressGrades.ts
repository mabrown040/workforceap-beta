import { scoreScaledToDisplayPercent } from '@/lib/coursera/courseGradeDisplay';

/**
 * Pick the grade to display per learner on the admin training roster.
 *
 * The roster used to show "the first scored row the query happened to
 * return", which was wrong twice over:
 *
 *  1. The read carried no `orderBy`, so "first" was unspecified — a learner
 *     with several scored courses could render a different grade per load.
 *  2. An in-progress course carries a *partial* score. Measured against
 *     production, one member displayed 16% — the partial score of a course
 *     still underway — while holding 85.4% and 86.0% on two completed
 *     courses. The column made a passing learner look like a failing one.
 *
 * A grade is something earned, so only a completed course can supply one.
 * Among completed courses the most recently active wins, and an exact tie
 * breaks on course slug so the choice is stable rather than incidental.
 */

export type CourseGradeFact = {
  userId: string;
  courseSlug: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  /** Stored scale — 0–1 or 0–100; `scoreScaledToDisplayPercent` normalizes. */
  scoreScaled: number | null;
  lastActivityAt?: Date | null;
  lastUpdatedAt?: Date | null;
};

export function latestCompletedGradeByUser(
  rows: readonly CourseGradeFact[],
): Map<string, number> {
  const chosen = new Map<string, { activityMs: number; courseSlug: string }>();
  const grades = new Map<string, number>();

  for (const row of rows) {
    if (row.status !== 'COMPLETED') continue;
    const percent = scoreScaledToDisplayPercent(row.scoreScaled);
    if (percent == null) continue;

    const activityAt = row.lastActivityAt ?? row.lastUpdatedAt ?? null;
    const activityMs = activityAt ? activityAt.getTime() : 0;
    const current = chosen.get(row.userId);
    if (
      !current ||
      activityMs > current.activityMs ||
      (activityMs === current.activityMs && row.courseSlug < current.courseSlug)
    ) {
      chosen.set(row.userId, { activityMs, courseSlug: row.courseSlug });
      grades.set(row.userId, percent);
    }
  }

  return grades;
}
