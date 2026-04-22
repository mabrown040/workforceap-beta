import 'server-only';

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

export type ParsedCompletionStatement = {
  email: string;
  courseName?: string;
  courseSlug?: string;
  statementId?: string;
  verbId?: string;
};

export function parseCompletionStatements(payload: unknown): ParsedCompletionStatement[] {
  const items = Array.isArray(payload) ? payload : [payload];

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const statement = item as Record<string, unknown>;

    const actor = statement.actor && typeof statement.actor === 'object'
      ? (statement.actor as Record<string, unknown>)
      : null;
    const mbox = typeof actor?.mbox === 'string' ? actor.mbox.trim() : '';
    const email = mbox.toLowerCase().startsWith('mailto:') ? mbox.slice(7).trim().toLowerCase() : mbox.toLowerCase();
    if (!email) return [];

    const verb = statement.verb && typeof statement.verb === 'object'
      ? (statement.verb as Record<string, unknown>)
      : null;
    const verbId = typeof verb?.id === 'string' ? verb.id.toLowerCase() : '';

    const result = statement.result && typeof statement.result === 'object'
      ? (statement.result as Record<string, unknown>)
      : null;
    const completed =
      verbId.includes('completed') ||
      verbId.includes('passed') ||
      result?.completion === true ||
      result?.success === true;

    if (!completed) return [];

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
    const statementId = typeof statement.id === 'string' ? statement.id : undefined;

    return [{
      email,
      courseName,
      courseSlug,
      statementId,
      verbId: verbId || undefined,
    }];
  });
}
