import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type PersistXapiStatementInput = {
  statementId?: string | null;
  actorEmail?: string | null;
  verb: string;
  courseId?: string | null;
  courseName?: string | null;
  resultScoreScaled?: number | null;
  resultScoreRaw?: number | null;
  resultCompletion?: boolean | null;
  resultSuccess?: boolean | null;
};

/**
 * Persist a single xAPI row. When `statementId` is set and already exists, returns `skipped` (idempotent).
 */
export async function persistXapiStatement(
  input: PersistXapiStatementInput
): Promise<'inserted' | 'skipped'> {
  const statementId = input.statementId?.trim() || null;
  if (statementId) {
    const existing = await prisma.xapiStatement.findUnique({
      where: { statementId },
      select: { id: true },
    });
    if (existing) return 'skipped';
  }

  await prisma.xapiStatement.create({
    data: {
      statementId,
      actorEmail: input.actorEmail?.trim().toLowerCase() || null,
      verb: input.verb,
      courseId: input.courseId?.trim() || null,
      courseName: input.courseName?.trim() || null,
      resultScoreScaled: input.resultScoreScaled ?? null,
      resultScoreRaw: input.resultScoreRaw ?? null,
      resultCompletion: input.resultCompletion ?? null,
      resultSuccess: input.resultSuccess ?? null,
    },
  });

  return 'inserted';
}

export async function markXapiStatementProcessed(statementId: string | null | undefined) {
  const sid = statementId?.trim();
  if (!sid) return;
  await prisma.xapiStatement.updateMany({
    where: { statementId: sid },
    data: { processed: true, processedAt: new Date() },
  });
}
