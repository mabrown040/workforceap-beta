import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { parseXapiStatement } from '@/lib/xapi/statements';
import { markXapiStatementProcessed } from '@/lib/xapi/storage';
import { xapiStatementRowToRawStatement } from '@/lib/xapi/xapiStatementRowToRaw';

export type ReplayPendingXapiResult = {
  scanned: number;
  replayed: number;
  skippedUnparsed: number;
  /** Total per-completion-verb side effects emitted (may include failures). */
  completionsEmitted: number;
  /** Per-outcome breakdown so admin UIs can distinguish "0 matched" (no events
   *  resolved to a user) from "0 succeeded but 34 errored on course resolution"
   *  — different bugs, different fixes. */
  breakdown: {
    completedOk: number;
    /** Resolver matched, but downstream processing threw (e.g. course not found in catalog). */
    errored: number;
    /** Resolver matched, but the verb isn't a course completion (item-level, progressed, etc.). */
    ignored: number;
    /** Resolver couldn't bind the actor identity to a WAP user. */
    unmatched: number;
  };
};

/**
 * Drain `xapi_statements` rows still marked unprocessed (e.g. webhook arrived
 * before identity mapping existed, or transient failure after persist).
 */
export async function replayPendingXapiStatements(limit = 150): Promise<ReplayPendingXapiResult> {
  const rows = await prisma.xapiStatement.findMany({
    where: { processed: false },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return _replayRows(rows);
}

/**
 * Replay all pending xAPI statements for a specific actor email.
 * Called immediately after mapping an unmatched Coursera learner so their
 * progress is reflected without waiting for the next hourly cron run.
 */
export async function replayPendingXapiStatementsForEmail(
  actorEmail: string,
): Promise<ReplayPendingXapiResult> {
  const rows = await prisma.xapiStatement.findMany({
    where: { processed: false, actorEmail },
    orderBy: { createdAt: 'asc' },
  });

  return _replayRows(rows);
}

async function _replayRows(
  rows: Awaited<ReturnType<typeof prisma.xapiStatement.findMany>>,
): Promise<ReplayPendingXapiResult> {
  let replayed = 0;
  let skippedUnparsed = 0;
  let completionsEmitted = 0;
  const breakdown = { completedOk: 0, errored: 0, ignored: 0, unmatched: 0 };

  for (const row of rows) {
    const raw = xapiStatementRowToRawStatement(row);
    const parsed = parseXapiStatement(raw);
    if (!parsed) {
      skippedUnparsed += 1;
      await markXapiStatementProcessed(row.statementId);
      continue;
    }

    replayed += 1;
    const result = await handleInboundParsedStatement(parsed);
    completionsEmitted += result.completions.length;

    // Aggregate per-row outcome from the pipeline's classification. Reading
    // the just-written event row keeps this in lock-step with the
    // authoritative `completion_status` recorded by `recordXapiEvent`.
    if (parsed.statementId) {
      const eventRow = await prisma.$queryRaw<Array<{ status: string }>>`
        SELECT completion_status AS status
        FROM coursera_xapi_events
        WHERE statement_id = ${parsed.statementId}
        LIMIT 1
      `;
      const status = eventRow[0]?.status ?? 'unknown';
      if (status === 'completed') breakdown.completedOk += 1;
      else if (status === 'error') breakdown.errored += 1;
      else if (status === 'ignored') breakdown.ignored += 1;
      else if (status === 'unmatched') breakdown.unmatched += 1;
    }
  }

  return {
    scanned: rows.length,
    replayed,
    skippedUnparsed,
    completionsEmitted,
    breakdown,
  };
}
