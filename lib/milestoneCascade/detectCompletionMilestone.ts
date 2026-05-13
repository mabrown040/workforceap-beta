import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { isCronEnabled } from '@/lib/cron/isCronEnabled';

import {
  buildCascadeFromCompletion,
  type CompletionMilestoneInput,
} from './buildCascadeFromCompletion';

/**
 * Workflow key for the runtime kill switch. Toggling this off in
 * WorkflowDiagnostic disables detection without redeploying. Default: enabled.
 */
export const MILESTONE_CASCADE_WORKFLOW_KEY = 'milestone_cascade_detection';

export type DetectCompletionResult =
  | { ok: true; created: boolean; cascadeId: string | null; reason?: string }
  | { ok: false; reason: string; error?: unknown };

/**
 * Detect a course-completion milestone and (idempotently) insert a cascade
 * row in `milestone_cascades`. Safe to call multiple times for the same
 * completion — the unique constraint on (user_id, milestone_type, milestone_ref)
 * makes the second call a no-op.
 *
 * This function MUST NOT throw — milestone detection is a non-critical
 * side-channel and a failure here must not break the surrounding
 * completion flow. Errors are logged and returned as `{ ok: false }`.
 */
export async function detectCompletionMilestone(
  input: CompletionMilestoneInput,
): Promise<DetectCompletionResult> {
  // Runtime kill switch. Mirrors the cron-toggle pattern used elsewhere so
  // ops can disable cascade detection without a deploy.
  const enabled = await isCronEnabled(MILESTONE_CASCADE_WORKFLOW_KEY).catch(() => true);
  if (!enabled) {
    return { ok: true, created: false, cascadeId: null, reason: 'detection disabled by toggle' };
  }

  const decision = buildCascadeFromCompletion(input);
  if (!decision.shouldCreate) {
    return { ok: true, created: false, cascadeId: null, reason: decision.reason };
  }

  try {
    const created = await prisma.milestoneCascade.create({
      data: {
        userId: decision.row.userId,
        milestoneType: decision.row.milestoneType,
        milestoneRef: decision.row.milestoneRef,
        programSlug: decision.row.programSlug,
        contextSnapshot: decision.row.contextSnapshot as Prisma.InputJsonValue,
        sourceEventId: decision.row.sourceEventId,
        expiresAt: decision.row.expiresAt,
        // status defaults to 'pending_draft' at the DB level
      },
      select: { id: true },
    });
    return { ok: true, created: true, cascadeId: created.id };
  } catch (error) {
    // P2002 = unique constraint violation. Idempotent re-fire for the same
    // milestone — the row already exists, which is the desired outcome.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        ok: true,
        created: false,
        cascadeId: null,
        reason: 'cascade already exists for this milestone',
      };
    }
    console.error('[milestone-cascade] detectCompletionMilestone failed:', error);
    return { ok: false, reason: 'insert failed', error };
  }
}
