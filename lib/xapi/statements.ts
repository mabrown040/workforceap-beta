import 'server-only';

function firstRecordString(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const candidate of Object.values(value as Record<string, unknown>)) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const COURSERA_LEARN_SEGMENT = /\/learn\/([^/?#]+)/i;
const COURSERA_SPECIALIZATIONS = /\/specializations\/([^/?#]+)/i;
const COURSERA_PRO_CERTIFICATES = /\/professional-certificates\/([^/?#]+)/i;
const COURSERA_PROGRAMS = /\/programs\/([^/?#]+)/i;

function isUselessSlugSegment(segment: string): boolean {
  if (!segment) return true;
  const s = segment.trim().toLowerCase();
  if (s === 'learn' || s === 'www' || s === 'coursera.org') return true;
  if (/^[0-9]+$/.test(s)) return true;
  return false;
}

/**
 * Derive a Coursera course slug from an xAPI activity id (usually an IRI).
 * Coursera often uses deep links like /learn/{courseSlug}/week/1 — the course slug
 * appears immediately after /learn/, not as the last path segment.
 */
export function extractCourseraCourseSlugFromActivityId(activityId: string | null): string | null {
  if (!activityId?.trim()) return null;
  const id = activityId.trim();

  const slugFromPatterns = (href: string) => {
    const raw =
      href.match(COURSERA_LEARN_SEGMENT)?.[1]
      ?? href.match(COURSERA_SPECIALIZATIONS)?.[1]
      ?? href.match(COURSERA_PRO_CERTIFICATES)?.[1]
      ?? href.match(COURSERA_PROGRAMS)?.[1];
    if (!raw) return null;
    const s = toSlug(raw);
    return isUselessSlugSegment(s) ? null : s;
  };

  try {
    const url = new URL(id);
    const fromLearn = slugFromPatterns(url.href);
    if (fromLearn) return fromLearn;

    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : '';
    const fallback = last ? toSlug(last) : null;
    if (fallback && !isUselessSlugSegment(fallback)) return fallback;
    return null;
  } catch {
    const fromLearn = slugFromPatterns(id);
    if (fromLearn) return fromLearn;

    const last = id.split('/').filter(Boolean).pop() ?? '';
    const fallback = last ? toSlug(last) : null;
    if (fallback && !isUselessSlugSegment(fallback)) return fallback;
    return null;
  }
}

function pushContextActivityIds(context: Record<string, unknown> | null, out: string[]) {
  if (!context) return;
  const ca = context.contextActivities;
  if (!ca || typeof ca !== 'object' || Array.isArray(ca)) return;

  for (const key of ['parent', 'grouping', 'category', 'other'] as const) {
    const val = (ca as Record<string, unknown>)[key];
    if (val == null) continue;
    const items = Array.isArray(val) ? val : [val];
    for (const item of items) {
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        const sid = (item as { id: string }).id.trim();
        if (sid) out.push(sid);
      }
    }
  }
}

function collectActivityIds(statement: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const object = statement.object && typeof statement.object === 'object'
    ? (statement.object as Record<string, unknown>)
    : null;
  if (typeof object?.id === 'string' && object.id.trim()) {
    ids.push(object.id.trim());
  }

  const ctx = statement.context && typeof statement.context === 'object'
    ? (statement.context as Record<string, unknown>)
    : null;
  pushContextActivityIds(ctx, ids);

  return [...new Set(ids)];
}

export function resolveCourseSlugFromXapiStatement(statement: Record<string, unknown>): {
  courseSlug?: string;
  activityIds: string[];
  attempts: Array<{ activityId: string; extractedSlug: string | null }>;
} {
  const activityIds = collectActivityIds(statement);
  const attempts = activityIds.map((activityId) => ({
    activityId,
    extractedSlug: extractCourseraCourseSlugFromActivityId(activityId),
  }));

  let courseSlug: string | undefined;
  for (const a of attempts) {
    if (a.extractedSlug) {
      courseSlug = a.extractedSlug;
      break;
    }
  }

  const object = statement.object && typeof statement.object === 'object'
    ? (statement.object as Record<string, unknown>)
    : null;
  const definition = object?.definition && typeof object.definition === 'object'
    ? (object.definition as Record<string, unknown>)
    : null;
  const courseNameRaw =
    (typeof definition?.name === 'string' ? definition.name.trim() : null)
    || firstRecordString(definition?.name);

  if (!courseSlug && courseNameRaw) {
    courseSlug = toSlug(courseNameRaw);
  }

  return {
    courseSlug,
    activityIds,
    attempts,
  };
}

function flattenRawStatements(payload: unknown): Record<string, unknown>[] {
  if (payload == null) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const o = item as Record<string, unknown>;
      if (o.statement && typeof o.statement === 'object') {
        return [o.statement as Record<string, unknown>];
      }
      return [o];
    });
  }

  if (typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.statements)) {
      return flattenRawStatements(o.statements);
    }
    if (o.statement && typeof o.statement === 'object') {
      return [o.statement as Record<string, unknown>];
    }
    return [o];
  }

  return [];
}

export type ParsedCompletionStatement = {
  email?: string;
  actorIdentifier?: string;
  actorHomePage?: string;
  courseName?: string;
  courseSlug?: string;
  statementId?: string;
  verbId?: string;
  rawStatement: Record<string, unknown>;
};

export function parseCompletionStatements(payload: unknown): ParsedCompletionStatement[] {
  const items = flattenRawStatements(payload);

  return items.flatMap((statement) => {
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
    if (!email && !actorIdentifier) return [];

    const verb = statement.verb && typeof statement.verb === 'object'
      ? (statement.verb as Record<string, unknown>)
      : null;
    const verbId = typeof verb?.id === 'string' ? verb.id.toLowerCase() : '';

    const result = statement.result && typeof statement.result === 'object'
      ? (statement.result as Record<string, unknown>)
      : null;
    const completed =
      verbId.includes('completed')
      || verbId.includes('passed')
      || result?.completion === true
      || result?.success === true;

    if (!completed) return [];

    const object = statement.object && typeof statement.object === 'object'
      ? (statement.object as Record<string, unknown>)
      : null;
    const definition = object?.definition && typeof object.definition === 'object'
      ? (object.definition as Record<string, unknown>)
      : null;
    const courseName =
      (typeof definition?.name === 'string' ? definition.name.trim() : undefined)
      || firstRecordString(definition?.name)
      || undefined;

    const { courseSlug } = resolveCourseSlugFromXapiStatement(statement);
    const statementId = typeof statement.id === 'string' ? statement.id : undefined;

    return [{
      email: email || undefined,
      actorIdentifier: actorIdentifier || undefined,
      actorHomePage: actorHomePage || undefined,
      courseName,
      courseSlug,
      statementId,
      verbId: verbId || undefined,
      rawStatement: statement,
    }];
  });
}
