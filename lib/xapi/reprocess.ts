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
    result: 'matched' | 'already_processed' | 'no_statement' | 'parse_error' | 'error';
    error?: string;
  }>;
};

/**
 * Re-process unmatched xAPI events that now might match with a newly saved mapping.
 * Called automatically after saving a Coursera identity mapping.
 */
export async function reprocessUnmatchedXapiEvents(args: {
  courseraEmail?: string | null;
  actorIdentifier?: string | null;
  limit?: number;
}): Promise<ReprocessResult> {
  const limit = Math.min(args.limit ?? 50, 200);
  const normalizedEmail = args.courseraEmail?.trim().toLowerCase() || null;
  const normalizedActor = args.actorIdentifier?.trim() || null;

  // Find unmatched events that match the saved mapping criteria
  const unmatchedEvents = await prisma.$queryRaw<Array<{
    statement_id: string | null;
    actor_email: string | null;
    actor_identifier: string | null;
    actor_home_page: string | null;
    raw_payload: unknown;
  }>>`
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
      )
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  const result: ReprocessResult = {
    processed: 0,
    matched: 0,
    errors: 0,
    details: [],
  };

  for (const event of unmatchedEvents) {
    const statementId = event.statement_id;
    if (!statementId) {
      result.details.push({
        statementId: null,
        actorEmail: event.actor_email,
        result: 'no_statement',
      });
      continue;
    }

    try {
      // Load the original xAPI statement from storage
      const xapiStatement = await prisma.xapiStatement.findUnique({
        where: { statementId },
      });

      if (!xapiStatement) {
        result.details.push({
          statementId,
          actorEmail: event.actor_email,
          result: 'no_statement',
        });
        continue;
      }

      // Skip if already processed
      if (xapiStatement.processed) {
        result.details.push({
          statementId,
          actorEmail: event.actor_email,
          result: 'already_processed',
        });
        continue;
      }

      // Parse the raw payload
      const rawPayload = typeof xapiStatement.rawPayload === 'string'
        ? JSON.parse(xapiStatement.rawPayload)
        : xapiStatement.rawPayload;

      const parsed = parseXapiStatement(rawPayload as Record<string, unknown>);
      if (!parsed) {
        result.details.push({
          statementId,
          actorEmail: event.actor_email,
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
        statementId,
        actorEmail: event.actor_email,
        result: wasMatched ? 'matched' : 'error',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Re-process failed';
      result.errors += 1;
      result.details.push({
        statementId,
        actorEmail: event.actor_email,
        result: 'error',
        error: message,
      });
    }
  }

  return result;
}
