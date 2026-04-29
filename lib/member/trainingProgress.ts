import { getProgramBySlug } from '@/lib/content/programs';

export type TrainingProgress = {
  totalCourses: number;
  completedCount: number;
  pct: number;
};

/**
 * Compute a member's training progress as a 0–100 percentage of completed
 * courses against the courses defined for their enrolled program.
 *
 * Returns pct = 0 when the member is not enrolled, the program has no
 * courses, or coursesCompleted is empty/malformed. Only counts course
 * slugs that belong to the enrolled program — stale entries from a prior
 * program do not inflate the percentage.
 */
export function computeTrainingProgress(
  enrolledProgram: string | null | undefined,
  coursesCompleted: unknown
): TrainingProgress {
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const totalCourses = program?.courses.length ?? 0;
  if (totalCourses === 0) return { totalCourses: 0, completedCount: 0, pct: 0 };

  const list = Array.isArray(coursesCompleted) ? (coursesCompleted as unknown[]) : [];
  const completedSlugs = new Set(list.filter((s): s is string => typeof s === 'string'));
  const completedCount = program!.courses.filter((c) => completedSlugs.has(c.slug)).length;
  const pct = Math.round((completedCount / totalCourses) * 100);
  return { totalCourses, completedCount, pct };
}

/**
 * Threshold used by the admin Job-ready queue. A member is considered
 * job-ready when training progress crosses 70%, per the 2026-04-27 dad
 * review backlog. Distinct from interview-ready (which is gated by
 * pre-screening completion via the `interviewEligible` flag).
 */
export const JOB_READY_TRAINING_PCT = 70;
