function firstRecordString(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const candidate of Object.values(value as Record<string, unknown>)) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractCourseSlugFromObjectId(objectId: string | null) {
  if (!objectId) return null;
  try {
    const url = new URL(objectId);
    const last = url.pathname.split('/').filter(Boolean).pop();
    return last ? toSlug(last) : null;
  } catch {
    const last = objectId.split('/').filter(Boolean).pop();
    return last ? toSlug(last) : null;
  }
}

export type ParsedXapiStatement = {
  email?: string;
  actorIdentifier?: string;
  actorHomePage?: string;
  courseName?: string;
  courseSlug?: string;
  statementId?: string;
  verbId?: string;
  courseObjectId?: string | null;
  resultScoreScaled?: number | null;
  resultScoreRaw?: number | null;
  resultCompletion?: boolean | null;
  resultSuccess?: boolean | null;
  /** Normalized to 0–100 when present */
  resultProgressPercent?: number | null;
  rawStatement: Record<string, unknown>;
};

/** @deprecated Use ParsedXapiStatement */
export type ParsedCompletionStatement = ParsedXapiStatement;

export function flattenXapiStatementPayload(payload: unknown): Record<string, unknown>[] {
  const items = Array.isArray(payload) ? payload : [payload];
  return items.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item)
  );
}

function readScore(result: Record<string, unknown> | null): {
  scaled: number | null;
  raw: number | null;
} {
  if (!result?.score || typeof result.score !== 'object' || Array.isArray(result.score)) {
    return { scaled: null, raw: null };
  }
  const score = result.score as Record<string, unknown>;
  const scaled = typeof score.scaled === 'number' && Number.isFinite(score.scaled) ? score.scaled : null;
  const raw = typeof score.raw === 'number' && Number.isFinite(score.raw) ? score.raw : null;
  return { scaled, raw };
}

function readProgressPercent(result: Record<string, unknown> | null): number | null {
  if (!result || typeof result.progress !== 'number' || !Number.isFinite(result.progress)) return null;
  const p = result.progress;
  if (p >= 0 && p <= 1) return Math.round(p * 100);
  if (p > 1 && p <= 100) return Math.round(p);
  if (p > 100) return 100;
  return null;
}

export function parseXapiStatement(statement: Record<string, unknown>): ParsedXapiStatement | null {
  const actor = statement.actor && typeof statement.actor === 'object'
    ? (statement.actor as Record<string, unknown>)
    : null;
  const mbox = typeof actor?.mbox === 'string' ? actor.mbox.trim() : '';
  const email = mbox.toLowerCase().startsWith('mailto:') ? mbox.slice(7).trim().toLowerCase() : mbox.toLowerCase();
  const account = actor?.account && typeof actor.account === 'object'
    ? (actor.account as Record<string, unknown>)
    : null;
  const actorIdentifier = typeof account?.name === 'string' ? account.name.trim() : '';
  const actorHomePage = typeof account?.homePage === 'string' ? account.homePage.trim() : '';
  const statementId = typeof statement.id === 'string' ? statement.id : undefined;

  if (!email && !actorIdentifier && !statementId) return null;

  const verb = statement.verb && typeof statement.verb === 'object'
    ? (statement.verb as Record<string, unknown>)
    : null;
  const verbId = typeof verb?.id === 'string' ? verb.id : '';

  const result = statement.result && typeof statement.result === 'object'
    ? (statement.result as Record<string, unknown>)
    : null;
  const { scaled, raw } = readScore(result);
  const resultCompletion = typeof result?.completion === 'boolean' ? result.completion : null;
  const resultSuccess = typeof result?.success === 'boolean' ? result.success : null;
  const resultProgressPercent = readProgressPercent(result);

  const object = statement.object && typeof statement.object === 'object'
    ? (statement.object as Record<string, unknown>)
    : null;
  const objectId = typeof object?.id === 'string' ? object.id.trim() : null;
  const definition = object?.definition && typeof object.definition === 'object'
    ? (object.definition as Record<string, unknown>)
    : null;
  const courseName =
    (typeof definition?.name === 'string' ? definition.name.trim() : null) ||
    firstRecordString(definition?.name) ||
    undefined;
  const courseSlug = extractCourseSlugFromObjectId(objectId) || (courseName ? toSlug(courseName) : undefined);

  return {
    email: email || undefined,
    actorIdentifier: actorIdentifier || undefined,
    actorHomePage: actorHomePage || undefined,
    courseName,
    courseSlug,
    statementId,
    verbId: verbId || undefined,
    courseObjectId: objectId,
    resultScoreScaled: scaled,
    resultScoreRaw: raw,
    resultCompletion,
    resultSuccess,
    resultProgressPercent,
    rawStatement: statement,
  };
}

export function isXapiCompletionVerb(parsed: ParsedXapiStatement): boolean {
  const verbId = (parsed.verbId ?? '').toLowerCase();
  return (
    verbId.includes('completed')
    || verbId.includes('passed')
    || parsed.resultCompletion === true
    || parsed.resultSuccess === true
  );
}

export function isXapiCourseProgressVerb(parsed: ParsedXapiStatement): boolean {
  const verbId = (parsed.verbId ?? '').toLowerCase();
  if (isXapiCompletionVerb(parsed)) return true;
  return (
    verbId.includes('progressed')
    || verbId.includes('started')
    || verbId.includes('registered')
    || verbId.includes('initialized')
  );
}

export function parseCompletionStatements(payload: unknown): ParsedCompletionStatement[] {
  return flattenXapiStatementPayload(payload)
    .map(parseXapiStatement)
    .filter((s): s is ParsedXapiStatement => Boolean(s))
    .filter(isXapiCompletionVerb);
}
