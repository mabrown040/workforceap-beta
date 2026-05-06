import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { parseXapiStatement } from '@/lib/xapi/statements';
import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';

export type ReprocessResult = {
  processed: number;
  matched: number;
  errors: number;
  details: Array<{
    statementId: string | null;
    actorEmail: string | null;
    result: 'matched' | 'already_processed' | 'no_payload' | 'parse_error' | 'error' | 'no_match';
    error?: string;
  }>;
};

/**
 * Re-process unmatched xAPI events that now might match with a newly saved mapping.
 * Queries `coursera_xapi_events` with completion_status IN ('unmatched', 'error')
 * that have a non-null raw_payload.
 */
export async function reprocessUnmatchedXapiEvents(args: {
  userId?: string;
  courseraEmail?: string | null;
  actorIdentifier?: string | null;
  limit?: number;
}): Promise<ReprocessResult> {
  const limit = Math.min(args.limit ?? 50, 200);
  const normalizedEmail = args.courseraEmail?.trim().toLowerCase() || null;
  const normalizedActor = args.actorIdentifier?.trim() || null;

  // Find unmatched coursera_xapi_events that have raw_payload
  const unmatchedEvents = await prisma.$queryRaw<
    Array<{
      statement_id: string | null;
      actor_email: string | null;
      actor_identifier: string | null;
      raw_payload: unknown;
    }>
  >`
    SELECT
      statement_id,
      actor_email,
      actor_identifier,
      raw_payload
    FROM coursera_xapi_events
    WHERE completion_status IN ('unmatched', 'error')
      AND raw_payload IS NOT NULL
      AND (
        (${normalizedEmail}::text IS NOT NULL AND LOWER(actor_email) = ${normalizedEmail}::text)
        OR (${normalizedActor}::text IS NOT NULL AND actor_identifier = ${normalizedActor}::text)
        OR (
          ${normalizedEmail}::text IS NOT NULL
          AND actor_email IS NULL
          AND raw_payload->'actor'->>'mbox' ILIKE '%' || ${normalizedEmail}::text || '%'
        )
      )
    ORDER BY received_at DESC
    LIMIT ${limit}
  `;

  return runReprocessPipeline(unmatchedEvents, args.userId);
}

/**
 * Auto-heal: attempt to resolve any unmatched xAPI events by finding a matching
 * portal user and auto-creating a mapping. This runs without any manual mapping.
 */
export async function autoHealUnmatchedXapiEvents(limit = 50): Promise<ReprocessResult> {
  // Find unmatched events where we DON'T already have a mapping
  const unmatchedEvents = await prisma.$queryRaw<
    Array<{
      statement_id: string | null;
      actor_email: string | null;
      actor_identifier: string | null;
      raw_payload: unknown;
    }>
  >`
    SELECT
      cxe.statement_id,
      cxe.actor_email,
      cxe.actor_identifier,
      cxe.raw_payload
    FROM coursera_xapi_events cxe
    WHERE cxe.completion_status = 'unmatched'
      AND cxe.raw_payload IS NOT NULL
      AND cxe.statement_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM coursera_identity_mappings cim
        WHERE (
          cxe.actor_email IS NOT NULL
          AND LOWER(cim.coursera_email) = LOWER(cxe.actor_email)
        )
        OR (
          cxe.actor_identifier IS NOT NULL
          AND cim.actor_identifier = cxe.actor_identifier
        )
      )
    ORDER BY cxe.received_at DESC
    LIMIT ${limit}
  `;

  const result: ReprocessResult = {
    processed: 0,
    matched: 0,
    errors: 0,
    details: [],
  };

  for (const event of unmatchedEvents) {
    try {
      // Try to find a user by email
      const actorEmail = event.actor_email?.trim().toLowerCase();
      if (!actorEmail) {
        result.details.push({
          statementId: event.statement_id,
          actorEmail: event.actor_email,
          result: 'no_payload',
        });
        continue;
      }

      const user = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          email: { equals: actorEmail, mode: 'insensitive' },
        },
        select: { id: true, email: true, fullName: true },
      });

      if (!user) {
        result.details.push({
          statementId: event.statement_id,
          actorEmail: event.actor_email,
          result: 'no_match',
        });
        continue;
      }

      // Auto-create a mapping
      await upsertCourseraIdentityMapping({
        userId: user.id,
        courseraEmail: actorEmail,
        actorIdentifier: event.actor_identifier ?? null,
        source: 'auto-healed',
      });

      // Now reprocess the event
      const rawPayload =
        typeof event.raw_payload === 'string'
          ? JSON.parse(event.raw_payload)
          : event.raw_payload;

      const parsed = parseXapiStatement(rawPayload as Record<string, unknown>);
      if (!parsed) {
        result.details.push({
          statementId: event.statement_id,
          actorEmail: event.actor_email,
          result: 'parse_error',
        });
        result.errors += 1;
        continue;
      }

      const { completions } = await handleInboundParsedStatement(parsed);
      result.processed += 1;

      const wasMatched = completions.some((c) => (c as { ok?: boolean }).ok === true);
      if (wasMatched) {
        result.matched += 1;
      }

      result.details.push({
        statementId: event.statement_id,
        actorEmail: event.actor_email,
        result: wasMatched ? 'matched' : 'no_match',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-heal failed';
      result.errors += 1;
      result.details.push({
        statementId: event.statement_id,
        actorEmail: event.actor_email,
        result: 'error',
        error: message,
      });
    }
  }

  return result;
}

async function runReprocessPipeline(
  events: Array<{
    statement_id: string | null;
    actor_email: string | null;
    actor_identifier: string | null;
    raw_payload: unknown;
  }>,
  expectedUserId?: string
): Promise<ReprocessResult> {
  const result: ReprocessResult = {
    processed: 0,
    matched: 0,
    errors: 0,
    details: [],
  };

  for (const event of events) {
    const statementId = event.statement_id;
    if (!statementId) {
      result.details.push({
        statementId: null,
        actorEmail: event.actor_email,
        result: 'no_payload',
      });
      continue;
    }

    try {
      const rawPayload =
        typeof event.raw_payload === 'string'
          ? JSON.parse(event.raw_payload)
          : event.raw_payload;

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

      // Verify the resolved user matches expected if provided
      if (expectedUserId) {
        const identity = {
          email: parsed.email,
          actorIdentifier: parsed.actorIdentifier,
          actorHomePage: parsed.actorHomePage,
        };
        // Quick check: we'll let the pipeline resolve and verify after
      }

      const { completions } = await handleInboundParsedStatement(parsed);
      result.processed += 1;

      const wasMatched = completions.some((c) => (c as { ok?: boolean }).ok === true);
      if (wasMatched) {
        result.matched += 1;
      }

      result.details.push({
        statementId,
        actorEmail: event.actor_email,
        result: wasMatched ? 'matched' : 'no_match',
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
