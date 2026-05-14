import 'server-only';

import { prisma } from '@/lib/db/prisma';

import { draftCascade } from './draftCascade';

/**
 * One tick of the milestone-cascade drafting cron.
 *
 * Pulls up to `batchSize` rows in `pending_draft`, drafts each, accumulates
 * results. Cron calls this from the route handler; nothing about the work
 * here depends on Next.js / NextRequest so it's also callable from scripts
 * or admin endpoints.
 *
 * Failure handling:
 *   - `retryable: true`  → row stays `pending_draft`; next tick picks it up.
 *   - `retryable: false` → row moves to `expired` with a reason in
 *     `dismissed_reason` so a counselor can see what happened (the field is
 *     overloaded for both counselor-dismiss reasons and structural failures —
 *     prefixed with "[auto-expired]" to distinguish).
 *
 * Returns a summary the cron route serializes back to the caller AND that
 * `withCronLogging` persists into WorkflowDiagnostic for ops visibility.
 */

export interface DraftTickResult {
  candidates: number;
  drafted: number;
  failedRetryable: number;
  failedTerminal: number;
  /** Per-cascade outcomes for diagnostic logging. */
  outcomes: Array<{
    cascadeId: string;
    status: 'drafted' | 'retry' | 'expired';
    reason?: string;
  }>;
}

const TERMINAL_FAILURE_PREFIX = '[auto-expired] ';

export async function runMilestoneCascadeDraftTick(opts?: {
  batchSize?: number;
}): Promise<DraftTickResult> {
  const batchSize = opts?.batchSize ?? 25;

  const candidates = await prisma.milestoneCascade.findMany({
    where: { status: 'pending_draft' },
    select: {
      id: true,
      userId: true,
      milestoneType: true,
      contextSnapshot: true,
    },
    orderBy: { createdAt: 'asc' }, // FIFO so the oldest pending get the soonest counselor view
    take: batchSize,
  });

  const result: DraftTickResult = {
    candidates: candidates.length,
    drafted: 0,
    failedRetryable: 0,
    failedTerminal: 0,
    outcomes: [],
  };

  for (const cascade of candidates) {
    const outcome = await draftCascade(cascade);

    if (outcome.ok) {
      result.drafted += 1;
      result.outcomes.push({
        cascadeId: outcome.cascadeId,
        status: 'drafted',
      });
      continue;
    }

    if (outcome.retryable) {
      result.failedRetryable += 1;
      result.outcomes.push({
        cascadeId: outcome.cascadeId,
        status: 'retry',
        reason: outcome.reason,
      });
      continue;
    }

    // Terminal failure — move out of the queue so we don't loop on it.
    // Only flip rows that are still pending_draft (don't clobber a row that
    // moved while we worked on it).
    await prisma.milestoneCascade
      .updateMany({
        where: { id: outcome.cascadeId, status: 'pending_draft' },
        data: {
          status: 'expired',
          dismissedAt: new Date(),
          dismissedReason: TERMINAL_FAILURE_PREFIX + outcome.reason,
        },
      })
      .catch((err) => {
        console.error(
          '[milestone-cascade] failed to mark terminal cascade as expired:',
          err,
        );
      });

    result.failedTerminal += 1;
    result.outcomes.push({
      cascadeId: outcome.cascadeId,
      status: 'expired',
      reason: outcome.reason,
    });
  }

  return result;
}
