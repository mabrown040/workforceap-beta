import { canonicalizeProgramSlug } from '@/lib/content/programSlug';

export type MilestoneKey =
  | 'training_started'
  | 'first_course_completed'
  | 'course_completed'
  | 'program_halfway'
  | 'program_completed';

/**
 * Durable identity for one course-completion milestone.
 *
 * Course slugs are not globally unique across the catalog. Including the
 * canonical program keeps the existing database uniqueness constraint
 * idempotent per (user, program, course), while aliases for the same program
 * still collapse onto one key.
 */
export function courseCompletionMilestoneRef(
  programSlug: string | null | undefined,
  courseSlug: string,
): string {
  const canonicalProgram = programSlug?.trim()
    ? canonicalizeProgramSlug(programSlug)
    : 'no-program';
  return `${canonicalProgram}::${courseSlug.trim().toLowerCase()}`;
}

export type TrainingMilestoneState = {
  completedSlugs: string[];
  started: boolean;
};

export type TrainingMilestoneTruth = {
  trainingStarted: boolean;
  firstCourseCompleted: boolean;
  programHalfway: boolean;
  programCompleted: boolean;
  completedCount: number;
  totalCourses: number;
};

export function hasValidatedTrainingStarted(args: {
  rows: Array<{
    courseSlug: string;
    status: string;
    percentComplete: number;
    lastActivityAt: Date | null;
  }>;
  validatedSlugs: string[];
}): boolean {
  const validated = new Set(args.validatedSlugs);
  return args.rows.some(
    (row) =>
      validated.has(row.courseSlug) &&
      (row.status !== 'NOT_STARTED' ||
        row.percentComplete > 0 ||
        row.lastActivityAt != null),
  );
}

export function deriveTrainingMilestoneTruth(args: {
  completedSlugs: string[];
  started: boolean;
  validatedSlugs: string[];
}): TrainingMilestoneTruth {
  const validated = new Set(args.validatedSlugs);
  const completed = new Set(
    args.completedSlugs.filter((slug) => validated.has(slug)),
  );
  const totalCourses = validated.size;
  const completedCount = completed.size;
  return {
    trainingStarted: args.started,
    firstCourseCompleted: completedCount >= 1,
    programHalfway:
      totalCourses >= 2 && completedCount >= Math.ceil(totalCourses / 2),
    programCompleted: totalCourses > 0 && completedCount === totalCourses,
    completedCount,
    totalCourses,
  };
}

/**
 * Pure milestone transition detector. Callers supply only facts derived from
 * the validated syllabus list; percent alone never creates a completion.
 */
export function detectMilestoneTransitions(args: {
  previous: TrainingMilestoneState;
  next: TrainingMilestoneState & { validatedSlugs: string[] };
  courseSlugJustCompleted?: string;
}): MilestoneKey[] {
  const validated = new Set(args.next.validatedSlugs);
  const previousCompleted = new Set(
    args.previous.completedSlugs.filter((slug) => validated.has(slug)),
  );
  const nextCompleted = new Set(
    args.next.completedSlugs.filter((slug) => validated.has(slug)),
  );
  const transitions: MilestoneKey[] = [];
  const previousTruth = deriveTrainingMilestoneTruth({
    ...args.previous,
    validatedSlugs: args.next.validatedSlugs,
  });
  const nextTruth = deriveTrainingMilestoneTruth(args.next);

  if (!previousTruth.trainingStarted && nextTruth.trainingStarted) {
    transitions.push('training_started');
  }

  const completedSlug = args.courseSlugJustCompleted;
  if (
    completedSlug &&
    validated.has(completedSlug) &&
    !previousCompleted.has(completedSlug) &&
    nextCompleted.has(completedSlug)
  ) {
    if (!previousTruth.firstCourseCompleted && nextTruth.firstCourseCompleted) {
      transitions.push('first_course_completed');
    }
    transitions.push('course_completed');
  }

  if (!previousTruth.programHalfway && nextTruth.programHalfway) {
    transitions.push('program_halfway');
  }

  if (!previousTruth.programCompleted && nextTruth.programCompleted) {
    transitions.push('program_completed');
  }

  return transitions;
}
