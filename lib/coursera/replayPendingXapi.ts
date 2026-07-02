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
  /** Sentinel 'unresolved-%' organization_ids repaired after this replay. */
  orgsRepaired?: number;
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
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$transaction((tx) =>
    tx.xapiStatement.findMany({
      where: { processed: false, createdAt: { gte: ninetyDaysAgo } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }),
  );

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
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$transaction((tx) =>
    tx.xapiStatement.findMany({
      take: 500,
      where: { processed: false, actorEmail, createdAt: { gte: ninetyDaysAgo } },
      orderBy: { createdAt: 'asc' },
    }),
  );

  return _replayRows(rows);
}


/**
 * Replay xAPI statements that previously landed as unmatched/error for an identity.
 * These rows may already be marked processed, so this intentionally queries the
 * authoritative coursera_xapi_events table instead of only processed=false rows.
 */
export async function replayUnresolvedXapiStatementsForIdentity(args: {
  courseraEmail?: string | null;
  actorIdentifier?: string | null;
  sinceDays?: number;
}): Promise<ReplayPendingXapiResult> {
  const email = args.courseraEmail?.trim().toLowerCase() || null;
  const actor = args.actorIdentifier?.trim() || null;
  if (!email && !actor) {
    return _replayRows([]);
  }

  const sinceDays = args.sinceDays ?? 30;
  const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$transaction(async (tx) => {
    const matchingStatementIds = await tx.$queryRaw<Array<{ statementId: string }>>`
      SELECT statement_id AS "statementId"
      FROM coursera_xapi_events
      WHERE completion_status IN ('unmatched', 'error')
        AND statement_id IS NOT NULL
        AND (
          (${email}::text IS NOT NULL AND LOWER(actor_email) = ${email}::text)
          OR (${actor}::text IS NOT NULL AND actor_identifier = ${actor}::text)
        )
    `.then((result) => result.map((row) => row.statementId));

    return tx.xapiStatement.findMany({
      take: 500,
      where: {
        createdAt: { gte: cutoff },
        OR: [
          ...(email ? [{ actorEmail: email }] : []),
          ...(actor ? [{ actorAccountName: actor }] : []),
        ],
        statementId: { in: matchingStatementIds },
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  return _replayRows(rows);
}

/**
 * Repair 'unresolved-%' sentinel organization_ids left by the ingest trigger
 * for statements that arrived before their actor's identity mapping existed.
 * Set-based so one call fixes every sentinel row any current mapping can now
 * resolve — under org-scoped RLS those rows are invisible to every tenant
 * until repaired. Returns the number of rows fixed.
 */
export async function reconcileUnresolvedXapiOrganizations(): Promise<number> {
  const repaired = await prisma.$executeRaw`
    UPDATE xapi_statements xs
    SET organization_id = u.organization_id
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE xs.organization_id LIKE 'unresolved-%'
      AND (
        (xs.actor_email IS NOT NULL AND LOWER(xs.actor_email) = LOWER(cim.coursera_email))
        OR (xs.actor_account_name IS NOT NULL AND xs.actor_account_name = cim.actor_identifier)
      )
  `;
  return repaired;
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
      const eventRow = await prisma.$transaction((tx) =>
        tx.$queryRaw<Array<{ status: string }>>`
          SELECT completion_status AS status
          FROM coursera_xapi_events
          WHERE statement_id = ${parsed.statementId}
          LIMIT 1
        `,
      );
      const status = eventRow[0]?.status ?? 'unknown';
      if (status === 'completed') breakdown.completedOk += 1;
      else if (status === 'error') breakdown.errored += 1;
      else if (status === 'ignored') breakdown.ignored += 1;
      else if (status === 'unmatched') breakdown.unmatched += 1;
    }
  }

  // Now that the identity mapping that triggered this replay exists, repair
  // any sentinel organization_ids so the raw statement history becomes
  // visible to the member's org again (RLS filters 'unresolved-%' rows out
  // of every tenant).
  const orgsRepaired = await reconcileUnresolvedXapiOrganizations().catch((err) => {
    console.error('[replayPendingXapi] sentinel org reconciliation failed', err);
    return 0;
  });

  return {
    scanned: rows.length,
    replayed,
    skippedUnparsed,
    completionsEmitted,
    orgsRepaired,
    breakdown,
  };
}
