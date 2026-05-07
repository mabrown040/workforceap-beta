import 'server-only';

import type { XapiStatement } from '@prisma/client';

/**
 * Reconstruct an xAPI-shaped object from a persisted `XapiStatement` row so
 * `parseXapiStatement` can run during cron replay.
 *
 * Prefers the full original `payload` JSONB when available (rows persisted by
 * the new write path — preserves `object.definition.type`,
 * `context.extensions.courseId`, `result.progress`, etc.). Falls back to the
 * flat-column reconstruction for legacy rows that pre-date the payload column.
 */
export function xapiStatementRowToRawStatement(row: XapiStatement): Record<string, unknown> {
  if (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
    // Trust the persisted payload — it's the source of truth.
    return row.payload as Record<string, unknown>;
  }

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
  if (row.actorAccountName?.trim()) {
    actor.account = {
      name: row.actorAccountName.trim(),
      ...(row.actorHomePage?.trim() ? { homePage: row.actorHomePage.trim() } : {}),
    };
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
