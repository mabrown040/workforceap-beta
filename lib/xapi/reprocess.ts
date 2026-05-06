import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { parseXapiStatement } from '@/lib/xapi/statements';

export type ReprocessResult = {
  processed: number;
  matched: number;
  errors: number;
  details: Array<{
    statementId: string | null;
    actorEmail: string | null;
    result: 'matched' | 'already_processed' | 'no_statement' | 'parse_error' | 'error' | 'no_match';
    error?: string;
  }>;
};

/**
 * Re-process xAPI events that now might match with a newly saved mapping.
 * Queries BOTH:
 * 1. `xapi_statements` with processed = false (never processed through pipeline)
 * 2. `coursera_xapi_events` with completion_status IN ('unmatched', 'error')
 *
 * This is robust against cases where `coursera_xapi_events` has NULL actor_email
 * or the statement was never fully processed.
 */
export async function reprocessUnmatchedXapiEvents(args: {
  userId: string;
  courseraEmail?: string | null;
  actorIdentifier?: string | null;
  limit?: number;
}): Promise<ReprocessResult> {
  const limit = Math.min(args.limit ?? 50, 200);
  const normalizedEmail = args.courseraEmail?.trim().toLowerCase() || null;
  const normalizedActor = args.actorIdentifier?.trim() || null;

  // Find unprocessed xapi_statements by email (case-insensitive)
  const unprocessedStatements = normalizedEmail
    ? await prisma.$queryRaw<
        Array<{
          statement_id: string | null;
          actor_email: string | null;
          raw_payload: unknown;
        }>
      >`
        SELECT
          statement_id,
          actor_email,
          raw_payload
        FROM xapi_statements
        WHERE processed = false
          AND statement_id IS NOT NULL
          AND LOWER(actor_email) = ${normalizedEmail}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : [];

  // Find unmatched coursera_xapi_events by email or actor
  const unmatchedEvents = await prisma.$queryRaw<
    Array<{
      statement_id: string | null;
      actor_email: string | null;
      actor_identifier: string | null;
      actor_home_page: string | null;
      raw_payload: unknown;
    }>
  >`
    SELECT
      statement_id,
      actor_email,
      actor_identifier,
      actor_home_page,
      raw_payload
    FROM coursera_xapi_events
    WHERE completion_status IN ('unmatched', 'error')
      AND statement_id IS NOT NULL
      AND (
        (${normalizedEmail}::text IS NOT NULL AND LOWER(actor_email) = ${normalizedEmail}::text)
        OR (${normalizedActor}::text IS NOT NULL AND actor_identifier = ${normalizedActor}::text)
        OR (
          ${normalizedEmail}::text IS NOT NULL
          AND actor_email IS NULL
          AND EXISTS (
            SELECT 1 FROM xapi_statements xs
            WHERE xs.statement_id = coursera_xapi_events.statement_id
              AND LOWER(xs.actor_email) = ${normalizedEmail}
          )
        )
      )
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  // Deduplicate by statement_id
  const seenStatementIds = new Set<string>();
  const toProcess: Array<{
    statementId: string;
    actorEmail: string | null;
    rawPayload: unknown;
    source: 'unprocessed' | 'unmatched_event';
  }> = [];

  for (const row of unprocessedStatements) {
    const sid = row.statement_id;
    if (!sid || seenStatementIds.has(sid)) continue;
    seenStatementIds.add(sid);
    toProcess.push({
      statementId: sid,
      actorEmail: row.actor_email,
      rawPayload: row.raw_payload,
      source: 'unprocessed',
    });
  }

  for (const row of unmatchedEvents) {
    const sid = row.statement_id;
    if (!sid || seenStatementIds.has(sid)) continue;
    seenStatementIds.add(sid);
    toProcess.push({
      statementId: sid,
      actorEmail: row.actor_email,
      rawPayload: row.raw_payload,
      source: 'unmatched_event',
    });
  }

  const result: ReprocessResult = {
    processed: 0,
    matched: 0,
    errors: 0,
    details: [],
  };

  for (const item of toProcess.slice(0, limit)) {
    try {
      // Load the original xAPI statement from storage
      const xapiStatement = await prisma.xapiStatement.findUnique({
        where: { statementId: item.statementId },
      });

      if (!xapiStatement) {
        result.details.push({
          statementId: item.statementId,
          actorEmail: item.actorEmail,
          result: 'no_statement',
        });
        continue;
      }

      // Skip if already processed and has a successful completion
      if (xapiStatement.processed) {
        // Still reprocess if it's an unmatched event — the whole point is to try again
        if (item.source !== 'unmatched_event') {
          result.details.push({
            statementId: item.statementId,
            actorEmail: item.actorEmail,
            result: 'already_processed',
          });
          continue;
        }
      }

      // Parse the raw payload
      const rawPayload =
        typeof xapiStatement.rawPayload === 'string'
          ? JSON.parse(xapiStatement.rawPayload)
          : xapiStatement.rawPayload;

      const parsed = parseXapiStatement(rawPayload as Record<string, unknown>);
      if (!parsed) {
        result.details.push({
          statementId: item.statementId,
          actorEmail: item.actorEmail,
          result: 'parse_error',
        });
        result.errors += 1;
        continue;
      }

      // Re-process through the pipeline
      const { completions } = await handleInboundParsedStatement(parsed);
      result.processed += 1;

      const wasMatched = completions.some((c) => (c as { ok?: boolean }).ok === true);
      if (wasMatched) {
        result.matched += 1;
      }

      result.details.push({
        statementId: item.statementId,
        actorEmail: item.actorEmail,
        result: wasMatched ? 'matched' : 'no_match',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Re-process failed';
      result.errors += 1;
      result.details.push({
        statementId: item.statementId,
        actorEmail: item.actorEmail,
        result: 'error',
        error: message,
      });
    }
  }

  return result;
}
