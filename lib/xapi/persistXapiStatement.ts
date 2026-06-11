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

/**
 * Persist a single xAPI row.
 * Duplicate statementIds only skip side effects after the row was marked processed.
 */
export async function persistXapiStatement(
  input: PersistXapiStatementInput
): Promise<PersistXapiStatementResult> {
  const statementId = input.statementId?.trim() || null;

  try {
    await prisma.xapiStatement.create({
      data: {
        statementId,
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
        payload: input.payload == null ? Prisma.DbNull : input.payload,
        courseItemId: input.courseItemId?.trim() || null,
        itemType: input.itemType?.trim() || null,
      },
    });
    return 'inserted';
  } catch (error) {
    if (
      statementId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.xapiStatement.findUnique({
        where: { statementId },
        select: { processed: true },
      });
      return existing?.processed ? 'already_processed' : 'retry_processing';
    }
    throw error;
  }
}

export async function markXapiStatementProcessed(statementId: string | null | undefined) {
  const sid = statementId?.trim();
  if (!sid) return;
  await prisma.xapiStatement.updateMany({
    where: { statementId: sid },
    data: { processed: true, processedAt: new Date() },
  });
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
