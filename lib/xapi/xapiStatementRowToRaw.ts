import 'server-only';

import type { XapiStatement } from '@prisma/client';

/**
 * Reconstruct a minimal xAPI-shaped object from a persisted `XapiStatement` row
 * so `parseXapiStatement` can run during cron replay (full JSON is not stored).
 */
export function xapiStatementRowToRawStatement(row: XapiStatement): Record<string, unknown> {
  const objectId = row.courseId?.trim()
    ? `https://www.coursera.org/learn/${row.courseId.trim()}`
    : 'https://www.coursera.org/';

  const result: Record<string, unknown> = {};
  if (row.resultScoreScaled != null || row.resultScoreRaw != null) {
    result.score = {
      ...(row.resultScoreScaled != null ? { scaled: row.resultScoreScaled } : {}),
      ...(row.resultScoreRaw != null ? { raw: row.resultScoreRaw } : {}),
    };
  }
  if (row.resultCompletion != null) result.completion = row.resultCompletion;
  if (row.resultSuccess != null) result.success = row.resultSuccess;

  const actor: Record<string, unknown> = {};
  if (row.actorEmail?.trim()) {
    actor.mbox = `mailto:${row.actorEmail.trim().toLowerCase()}`;
  }

  return {
    ...(row.statementId ? { id: row.statementId } : {}),
    actor,
    verb: { id: row.verb },
    object: {
      id: objectId,
      ...(row.courseName?.trim() ? { definition: { name: row.courseName.trim() } } : {}),
    },
    ...(Object.keys(result).length ? { result } : {}),
  };
}
