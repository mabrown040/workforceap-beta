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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBooleanishTrue(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'completed' || normalized === 'passed';
}

function extractCourseSlugFromObjectId(objectId: string | null) {
  if (!objectId) return null;
  try {
    const url = new URL(objectId);
    const learnIndex = url.pathname.toLowerCase().indexOf('/learn/');
    if (learnIndex >= 0) {
      const learnPath = url.pathname.slice(learnIndex + '/learn/'.length);
      const learnSlug = learnPath.split('/').filter(Boolean).shift();
      if (learnSlug) return toSlug(learnSlug);
    }
    const last = url.pathname.split('/').filter(Boolean).pop();
    return last ? toSlug(last) : null;
  } catch {
    const byPath = objectId.split('/').filter(Boolean).pop();
    if (byPath) return toSlug(byPath);
    const byColon = objectId.split(':').filter(Boolean).pop();
    return byColon ? toSlug(byColon) : null;
  }
}

function extractCourseSlugFromDefinitionExtensions(definition: Record<string, unknown> | null): string | null {
  const ext = asRecord(definition?.extensions);
  if (!ext) return null;
  for (const [key, value] of Object.entries(ext)) {
    const keyNorm = key.toLowerCase();
    if (!keyNorm.includes('course') && !keyNorm.includes('slug')) continue;
    const direct = asNonEmptyString(value);
    if (direct) return toSlug(direct);
    const nested = asRecord(value);
    const nestedSlug = asNonEmptyString(nested?.slug) || asNonEmptyString(nested?.courseSlug);
    if (nestedSlug) return toSlug(nestedSlug);
  }
  return null;
}

function hasCompletionVerb(verb: Record<string, unknown> | null): boolean {
  const verbId = asNonEmptyString(verb?.id)?.toLowerCase() || '';
  if (verbId.includes('completed') || verbId.includes('passed')) return true;
  const display = asRecord(verb?.display);
  if (!display) return false;
  return Object.values(display).some((candidate) => {
    if (typeof candidate !== 'string') return false;
    const value = candidate.trim().toLowerCase();
    return value.includes('completed') || value.includes('passed');
  });
}

function extractActorIdentity(statement: Record<string, unknown>) {
  const actor = asRecord(statement.actor);
  if (!actor) {
    return { email: '', actorIdentifier: '', actorHomePage: '' };
  }
  const mbox = asNonEmptyString(actor.mbox) || '';
  let email = mbox.toLowerCase().startsWith('mailto:') ? mbox.slice(7).trim().toLowerCase() : mbox.toLowerCase();

  // Group actors may provide member list instead of top-level mbox.
  if (!email) {
    const members = asArray(actor.member) ?? [];
    for (const member of members) {
      const memberRec = asRecord(member);
      const memberMbox = asNonEmptyString(memberRec?.mbox) || '';
      const extracted = memberMbox.toLowerCase().startsWith('mailto:')
        ? memberMbox.slice(7).trim().toLowerCase()
        : memberMbox.toLowerCase();
      if (extracted) {
        email = extracted;
        break;
      }
    }
  }

  const account = asRecord(actor.account);
  const actorIdentifier = asNonEmptyString(account?.name) || '';
  const actorHomePage = asNonEmptyString(account?.homePage) || '';
  return { email, actorIdentifier, actorHomePage };
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
  const payloadRecord = asRecord(payload);
  const statements = asArray(payloadRecord?.statements);
  const items = Array.isArray(payload) ? payload : statements ?? [payload];

  return items.flatMap((item) => {
    const statement = asRecord(item);
    if (!statement) return [];

    const { email, actorIdentifier, actorHomePage } = extractActorIdentity(statement);
    if (!email && !actorIdentifier) return [];

    const verb = asRecord(statement.verb);
    const verbId = asNonEmptyString(verb?.id)?.toLowerCase() || '';

    const result = asRecord(statement.result);
    const completed =
      hasCompletionVerb(verb) ||
      asBooleanishTrue(result?.completion) ||
      asBooleanishTrue(result?.success);

    if (!completed) return [];

    const object = asRecord(statement.object);
    const objectId = asNonEmptyString(object?.id);
    const definition = asRecord(object?.definition);
    const courseName =
      asNonEmptyString(definition?.name) ||
      asNonEmptyString(object?.name) ||
      firstRecordString(definition?.name) ||
      undefined;
    const courseSlug =
      extractCourseSlugFromDefinitionExtensions(definition) ||
      extractCourseSlugFromObjectId(objectId) ||
      (courseName ? toSlug(courseName) : undefined);
    const statementId = asNonEmptyString(statement.id) || undefined;

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
