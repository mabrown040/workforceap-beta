/**
 * Roster *construction* helpers for `/admin/training-progress`.
 *
 * Filter/sort live in `trainingProgressRoster.ts`. These decide which program
 * rows a learner emits and which pace label those rows carry — the two
 * decisions that used to live inline on the page, so a multi-program learner
 * could collapse to one row or a 90% idle learner could look stalled.
 */

export type TrainingPace = 'On track' | 'Ahead' | 'Behind' | 'Stalled';

/** Members idle this long with incomplete work count as Stalled. */
export const STALLED_IDLE_DAYS = 21;

export type TrainingLearnerRef = {
  id: string;
  enrolledProgram: string | null;
};

/**
 * Every program a learner should appear under on the roster.
 *
 * Stored primary (CourseEnrollment, else `User.enrolledProgram`) first, then
 * every program holding their course progress. The most-recent-activity
 * inference is a last resort: it must not hide a second program once either
 * a stored assignment or any progress row exists.
 */
export function programSlugsForLearner(args: {
  learner: TrainingLearnerRef;
  primaryEnrollment?: { programSlug: string } | null;
  progressProgramSlugs?: Iterable<string>;
  inferredProgramSlug?: string | null;
  resolveCanonicalSlug: (slug: string) => string | undefined;
}): string[] {
  const slugs = new Set<string>();
  const storedProgramSlug =
    args.primaryEnrollment?.programSlug ?? args.learner.enrolledProgram;
  const storedCanonical = storedProgramSlug
    ? args.resolveCanonicalSlug(storedProgramSlug)
    : undefined;
  if (storedCanonical) slugs.add(storedCanonical);
  for (const slug of args.progressProgramSlugs ?? []) {
    slugs.add(slug);
  }
  if (slugs.size === 0) {
    const inferredCanonical = args.inferredProgramSlug
      ? args.resolveCanonicalSlug(args.inferredProgramSlug)
      : undefined;
    if (inferredCanonical) slugs.add(inferredCanonical);
  }
  return [...slugs];
}

/**
 * Pace heuristic (lean — derived from % complete + recency):
 *   Ahead    → ≥ 85% complete (and not yet fully done counts as ahead too)
 *   Stalled  → incomplete AND no activity in the idle window (or never active)
 *   Behind   → < 40% complete but recently active
 *   On track → everything else
 *
 * Ahead is checked first, so a 90% learner idle for months is still Ahead —
 * not Stalled. Complete (100%) is therefore also always Ahead.
 */
export function deriveTrainingPace(args: {
  percentComplete: number;
  lastActivity?: Date;
  idleCutoff: Date;
}): TrainingPace {
  const complete = args.percentComplete >= 100;
  if (args.percentComplete >= 85) return 'Ahead';
  if (!complete && (!args.lastActivity || args.lastActivity < args.idleCutoff)) {
    return 'Stalled';
  }
  if (args.percentComplete < 40) return 'Behind';
  return 'On track';
}
