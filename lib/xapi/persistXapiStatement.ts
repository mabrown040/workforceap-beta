import { createHash } from 'crypto';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

export type PersistXapiStatementInput = {
  statementId?: string | null;
  actorEmail?: string | null;
  /** From actor.account.name — Coursera's external user identifier. */
  actorAccountName?: string | null;
  /** From actor.account.homePage — scopes actorAccountName. */
  actorHomePage?: string | null;
  verb: string;
  courseId?: string | null;
  courseName?: string | null;
  resultScoreScaled?: number | null;
  resultScoreRaw?: number | null;
  resultCompletion?: boolean | null;
  resultSuccess?: boolean | null;
  /** Full original xAPI statement. Stored verbatim so replay can reconstruct
   *  it (object.definition.type, context.extensions, result.progress, …).
   *  Typed as Prisma.InputJsonValue so the JSONB column accepts nested
   *  objects without per-call casts. */
  payload?: Prisma.InputJsonValue | null;
  /** Coursera's per-item identifier (e.g. `rX6bE`), parsed from
   *  `payload.object.id` when the URL contains `/item/<id>`. NULL for
   *  course-level statements. Powers the per-item admin drill-down. */
  courseItemId?: string | null;
  /** Coursera's item-type extension (e.g. `ITEM_TYPE_LECTURE`,
   *  `ITEM_TYPE_QUIZ`). NULL for course-level statements. */
  itemType?: string | null;
};

export type PersistXapiStatementResult = 'inserted' | 'already_processed' | 'retry_processing';

export type PersistXapiStatementOutput = {
  result: PersistXapiStatementResult;
  /** SHA-256 content hash when statementId was absent; null otherwise. */
  statementHash: string | null;
};

/**
 * Upper bound on the serialized `payload` JSON we'll hand to Prisma/Postgres.
 * Coursera webhook payloads are normally a few KB; anything past this is
 * either a malformed delivery or an abuse attempt. Rejecting up front avoids
 * an opaque `PrismaClientUnknownRequestError` from Postgres's own JSONB/row
 * size limits (Sentry JAVASCRIPT-NEXTJS-12) and gives callers a typed error
 * they can log/skip instead of a generic DB failure.
 */
const MAX_PAYLOAD_BYTES = 256 * 1024;

/** Thrown by {@link persistXapiStatement} when the payload fails size/content validation. */
export class InvalidXapiPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidXapiPayloadError';
  }
}

/**
 * Rejects oversized payloads and strips NUL bytes / invalid UTF-8 sequences
 * that Postgres's `jsonb`/`text` columns cannot store (NUL bytes in
 * particular are rejected outright by Postgres, surfacing as an unknown
 * Prisma error rather than a clean validation failure).
 */
function sanitizePayload(
  payload: Prisma.InputJsonValue | null | undefined
): Prisma.InputJsonValue | null | undefined {
  if (payload == null) return payload;

  let serialized: string;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    throw new InvalidXapiPayloadError('xAPI payload is not JSON-serializable');
  }

  const byteLength = Buffer.byteLength(serialized, 'utf8');
  if (byteLength > MAX_PAYLOAD_BYTES) {
    throw new InvalidXapiPayloadError(
      `xAPI payload too large (${byteLength} bytes; max ${MAX_PAYLOAD_BYTES})`
    );
  }

  if (serialized.includes('\u0000')) {
    // Strip NUL bytes rather than reject outright — some producers embed
    // stray NULs in free-text fields; the rest of the statement is still
    // worth keeping.
    const cleaned = serialized.split('\u0000').join('');
    try {
      return JSON.parse(cleaned) as Prisma.InputJsonValue;
    } catch {
      throw new InvalidXapiPayloadError('xAPI payload contains invalid NUL bytes');
    }
  }

  return payload;
}

/**
 * Compute a deterministic hash from the statement content for idempotency
 * when `statementId` is absent (Coursera webhooks sometimes omit it).
 * Uses actor + verb + course + result so duplicate deliveries of the same
 * event are recognised without a full table scan.
 */
function computeStatementHash(input: PersistXapiStatementInput): string {
  const parts = [
    input.actorEmail?.trim().toLowerCase() || '',
    input.actorAccountName?.trim() || '',
    input.actorHomePage?.trim() || '',
    input.verb,
    input.courseId?.trim() || '',
    input.courseName?.trim() || '',
    input.courseItemId?.trim() || '',
    input.itemType?.trim() || '',
    input.resultCompletion === true ? '1' : input.resultCompletion === false ? '0' : '',
    input.resultSuccess === true ? '1' : input.resultSuccess === false ? '0' : '',
    input.resultScoreScaled != null ? String(input.resultScoreScaled) : '',
    input.resultScoreRaw != null ? String(input.resultScoreRaw) : '',
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Persist a single xAPI row.
 * Duplicate statementIds (or content hashes when statementId is absent) skip
 * side effects after the row was marked processed.
 */
export async function persistXapiStatement(
  input: PersistXapiStatementInput
): Promise<PersistXapiStatementOutput> {
  const statementId = input.statementId?.trim() || null;
  const statementHash = statementId ? null : computeStatementHash(input);
  const sanitizedPayload = sanitizePayload(input.payload);

  try {
    await prisma.xapiStatement.create({
      data: {
        statementId,
        statementHash,
        actorEmail: input.actorEmail?.trim().toLowerCase() || null,
        actorAccountName: input.actorAccountName?.trim() || null,
        actorHomePage: input.actorHomePage?.trim() || null,
        verb: input.verb,
        courseId: input.courseId?.trim() || null,
        courseName: input.courseName?.trim() || null,
        resultScoreScaled: input.resultScoreScaled ?? null,
        resultScoreRaw: input.resultScoreRaw ?? null,
        resultCompletion: input.resultCompletion ?? null,
        resultSuccess: input.resultSuccess ?? null,
        payload: sanitizedPayload == null ? Prisma.DbNull : sanitizedPayload,
        courseItemId: input.courseItemId?.trim() || null,
        itemType: input.itemType?.trim() || null,
      },
    });
    return { result: 'inserted', statementHash };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Unique constraint hit on statementId or statementHash
      if (statementId) {
        const existing = await prisma.xapiStatement.findUnique({
          where: { statementId },
          select: { processed: true },
        });
        return { result: existing?.processed ? 'already_processed' : 'retry_processing', statementHash };
      }
      if (statementHash) {
        const existing = await prisma.xapiStatement.findFirst({
          where: { statementHash },
          select: { processed: true },
          orderBy: { createdAt: 'desc' },
        });
        return { result: existing?.processed ? 'already_processed' : 'retry_processing', statementHash };
      }
    }
    throw error;
  }
}

export async function markXapiStatementProcessed(
  statementId: string | null | undefined,
  statementHash?: string | null
) {
  const sid = statementId?.trim();
  if (sid) {
    await prisma.xapiStatement.updateMany({
      where: { statementId: sid },
      data: { processed: true, processedAt: new Date() },
    });
    return;
  }
  const hash = statementHash?.trim();
  if (hash) {
    await prisma.xapiStatement.updateMany({
      where: { statementHash: hash },
      data: { processed: true, processedAt: new Date() },
    });
  }
}

const COURSERA_REST_WEBHOOK_VERB = 'coursera.rest.webhook';

/**
 * Idempotency for `/api/webhooks/coursera` deliveries (Coursera retries non-2xx).
 * Uses `XapiStatement.statementId` as a synthetic delivery key (prefix `wh:rest:`).
 *
 * - `already_processed`: safe to return 200 without re-running side effects.
 * - `retry_processing`: same delivery failed mid-flight; continue processing.
 * - `fresh`: new delivery row created; proceed then call `markXapiStatementProcessed` on success.
 */
export async function claimCourseraRestWebhookStatement(
  statementId: string
): Promise<'already_processed' | 'retry_processing' | 'fresh'> {
  const sid = statementId.trim();
  if (!sid) return 'fresh';

  const existing = await prisma.xapiStatement.findUnique({
    where: { statementId: sid },
    select: { processed: true },
  });

  if (existing?.processed) return 'already_processed';
  if (existing) return 'retry_processing';

  try {
    await prisma.xapiStatement.create({
      data: {
        statementId: sid,
        actorEmail: null,
        verb: COURSERA_REST_WEBHOOK_VERB,
        courseId: null,
        courseName: null,
        resultScoreScaled: null,
        resultScoreRaw: null,
        resultCompletion: null,
        resultSuccess: null,
        processed: false,
      },
    });
    return 'fresh';
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const row = await prisma.xapiStatement.findUnique({
        where: { statementId: sid },
        select: { processed: true },
      });
      if (row?.processed) return 'already_processed';
      return 'retry_processing';
    }
    throw error;
  }
}
