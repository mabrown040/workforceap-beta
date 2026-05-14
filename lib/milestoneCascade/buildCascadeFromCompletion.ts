import {
  MILESTONE_CASCADE_TTL_HOURS,
  type MilestoneType,
} from './types';

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
  if (input.source === 'coursera-enterprise-sync') {
    return {
      shouldCreate: false,
      reason: 'enterprise-sync backfill — historical completion, not a real-time event',
    };
  }

  if (!input.courseSlug) {
    return { shouldCreate: false, reason: 'missing courseSlug' };
  }

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + MILESTONE_CASCADE_TTL_HOURS * 60 * 60 * 1000);

  return {
    shouldCreate: true,
    row: {
      userId: input.userId,
      milestoneType: 'course_completed',
      milestoneRef: input.courseSlug,
      programSlug: input.programSlug,
      contextSnapshot: {
        courseSlug: input.courseSlug,
        courseName: input.courseName,
        programSlug: input.programSlug,
        completedCount: input.completedCount,
        source: input.source,
        detectedAt: now.toISOString(),
      },
      sourceEventId: input.sourceEventId ?? null,
      expiresAt,
    },
  };
}
