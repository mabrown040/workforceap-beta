import {
  MILESTONE_CASCADE_TTL_HOURS,
  type MilestoneType,
} from './types';
import { courseCompletionMilestoneRef } from '@/lib/coursera/milestones';

/**
 * Pure input for a course-completion milestone. Whatever event handler fires
 * a cascade is responsible for filling this in.
 */
export interface CompletionMilestoneInput {
  userId: string;
  courseSlug: string;
  courseName: string;
  programSlug: string | null;
  /** Total courses the user has completed in this program at detection time. */
  completedCount: number;
  /** What triggered the detection — used for traceability and to inform the
   *  later LLM draft (an enterprise-sync backfill should not generate
   *  celebration emails). */
  source: 'member' | 'coursera-webhook' | 'coursera-enterprise-sync';
  /** Optional xAPI statement_id from the trigger event. */
  sourceEventId?: string | null;
  /** Override "now" — test seam. Defaults to new Date() at the call site. */
  now?: Date;
}

export interface TrainingMilestoneInput {
  userId: string;
  milestoneType: MilestoneType;
  /** Stable idempotency reference: canonical program::course for course
   * milestones; canonical program slug otherwise. */
  milestoneRef: string;
  programSlug: string | null;
  completedCount: number;
  totalCourses?: number;
  courseSlug?: string | null;
  courseName?: string | null;
  source: CompletionMilestoneInput['source'];
  sourceEventId?: string | null;
  now?: Date;
}

/**
 * The shape that `detectCompletionMilestone()` will pass to Prisma when
 * inserting a `milestone_cascades` row. Plain JSON-serializable values
 * everywhere so the row survives round-trips through Postgres.
 */
export interface CascadeRowDraft {
  userId: string;
  milestoneType: MilestoneType;
  milestoneRef: string;
  programSlug: string | null;
  contextSnapshot: Record<string, unknown>;
  sourceEventId: string | null;
  expiresAt: Date;
}

export function buildCascadeFromMilestone(
  input: TrainingMilestoneInput,
): { shouldCreate: false; reason: string } | { shouldCreate: true; row: CascadeRowDraft } {
  const enterpriseCelebration = [
    'first_course_completed',
    'course_completed',
    'program_completed',
  ].includes(input.milestoneType);
  if (input.source === 'coursera-enterprise-sync' && enterpriseCelebration) {
    return {
      shouldCreate: false,
      reason: 'enterprise-sync backfill — historical completion, not a real-time celebration',
    };
  }

  if (input.milestoneType === 'course_completed' && !input.courseSlug?.trim()) {
    return { shouldCreate: false, reason: 'missing courseSlug' };
  }
  const milestoneRef = input.milestoneType === 'course_completed'
    ? courseCompletionMilestoneRef(input.programSlug, input.courseSlug!)
    : input.milestoneRef.trim();
  if (!milestoneRef) {
    return { shouldCreate: false, reason: 'missing milestoneRef' };
  }

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + MILESTONE_CASCADE_TTL_HOURS * 60 * 60 * 1000);

  return {
    shouldCreate: true,
    row: {
      userId: input.userId,
      milestoneType: input.milestoneType,
      milestoneRef,
      programSlug: input.programSlug,
      contextSnapshot: {
        ...(input.courseSlug ? { courseSlug: input.courseSlug } : {}),
        ...(input.courseName ? { courseName: input.courseName } : {}),
        programSlug: input.programSlug,
        completedCount: input.completedCount,
        ...(input.totalCourses == null ? {} : { totalCourses: input.totalCourses }),
        source: input.source,
        detectedAt: now.toISOString(),
      },
      sourceEventId: input.sourceEventId ?? null,
      expiresAt,
    },
  };
}

/**
 * Decide whether the given completion should create a milestone cascade, and
 * if so, what row to insert.
 *
 * Pure (no DB, no clock, no side effects beyond the optional `now` override).
 * Unit-testable.
 *
 * Today this is mostly a builder, but the boolean return slot exists because
 * the rule set will grow:
 *   - skip enterprise-sync backfills (the source flag exists already in
 *     completeMemberCourse — those are bulk historical loads, not real-time
 *     events deserving a celebration cascade).
 *   - in the future: skip if the user opted out of automated outreach,
 *     skip if the program is in a paused cohort, etc.
 */
export function buildCascadeFromCompletion(
  input: CompletionMilestoneInput,
): { shouldCreate: false; reason: string } | { shouldCreate: true; row: CascadeRowDraft } {
  if (!input.courseSlug) {
    return { shouldCreate: false, reason: 'missing courseSlug' };
  }
  return buildCascadeFromMilestone({
    userId: input.userId,
    milestoneType: 'course_completed',
    milestoneRef: courseCompletionMilestoneRef(input.programSlug, input.courseSlug),
    courseSlug: input.courseSlug,
    courseName: input.courseName,
    programSlug: input.programSlug,
    completedCount: input.completedCount,
    source: input.source,
    sourceEventId: input.sourceEventId,
    now: input.now,
  });
}
