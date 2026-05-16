/**
 * O*NET Web Services API v2 client.
 * @see https://services.onetcenter.org/reference/start/overview
 * Auth: X-API-Key header (set ONET_API_KEY).
 */

const BASE_URL = process.env.ONET_API_BASE_URL?.replace(/\/?$/, '/') ?? 'https://api-v2.onetcenter.org/';

export type OnetSearchOccupation = { code: string; title: string };

let lastCallAt = 0;
const MIN_INTERVAL_MS = 220;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastCallAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

function getApiKey(): string | undefined {
  return process.env.ONET_API_KEY?.trim() || undefined;
}

const MAX_RETRIES_429 = 4;

async function onetGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  attempt = 0
): Promise<T> {
  const key = getApiKey();
  if (!key) {
    throw new Error('ONET_API_KEY is not configured');
  }
  await throttle();
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.append(k, String(v));
    }
  }
  const qs = params.toString();
  const url = `${BASE_URL}${path.replace(/^\//, '')}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': key,
      Accept: 'application/json',
      'User-Agent': 'WorkforceAP/1.0 (career-matching)',
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) {
    if (attempt >= MAX_RETRIES_429) {
      throw new Error(`O*NET rate-limited after ${MAX_RETRIES_429} retries`);
    }
    const backoff = 250 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, backoff));
    return onetGet<T>(path, query, attempt + 1);
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`O*NET response not JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 422 && data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  if (!res.ok) {
    throw new Error(`O*NET request failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return data as T;
}

/** Server-only JSON GET for O*NET paths not wrapped by a typed helper yet. */
export async function onetApiGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<T> {
  return onetGet<T>(path, query);
}

export function isOnetConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function searchOccupations(query: string): Promise<OnetSearchOccupation[]> {
  const q = query.trim();
  if (!q) return [];
  type SearchResp = {
    occupation?: { code: string; title: string }[];
    error?: string;
  };
  const data = await onetGet<SearchResp>('online/search', { keyword: q, end: 30 });
  if (data.error) throw new Error(data.error);
  const results = (data.occupation ?? []).map((o) => ({ code: o.code, title: o.title }));

  // Re-rank so title-matching results appear before description-only matches.
  // Scoring: exact title > query-prefix > all words whole-word-prefix > any word whole-word-prefix > API order.
  // wordPrefixIn prevents suffix matches: "care" will not score "Daycare" but will score "Career".
  const ql = q.toLowerCase();
  const words = ql.split(/\s+/).filter(Boolean);
  const wordPrefixIn = (needle: string, haystack: string): boolean => {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[\\s\\-,/])${escaped}`, 'i').test(haystack);
  };
  const score = (title: string): number => {
    const t = title.toLowerCase();
    if (t === ql) return 4;
    if (t.startsWith(ql)) return 3;
    if (words.length > 1 && words.every((w) => wordPrefixIn(w, t))) return 2;
    if (words.some((w) => wordPrefixIn(w, t))) return 1;
    return 0;
  };
  // Stable sort: preserve API order within the same score tier.
  return results
    .map((o, i) => ({ o, i, s: score(o.title) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(({ o }) => o);
}

export type OnetOccupationOverview = {
  code: string;
  title: string;
  description?: string;
  tags?: { bright_outlook?: boolean; job_zone?: string };
};

export async function getOccupation(onetCode: string): Promise<OnetOccupationOverview | null> {
  const code = onetCode.trim();
  type Ov = {
    occupation?: { code: string; title: string; description?: string; tags?: { bright_outlook?: boolean } };
    error?: string;
  };
  const data = await onetGet<Ov>(`online/occupations/${encodeURIComponent(code)}`);
  if (data.error) {
    // O*NET returns 200 with an error body for some "not found" cases.
    return null;
  }
  const o = data.occupation;
  if (!o) {
    return null;
  }
  return {
    code: o.code,
    title: o.title,
    description: o.description,
    tags: o.tags,
  };
}

type ElementRating = {
  id?: string;
  name?: string;
  element?: { name?: string };
  rating?: { importance?: number; level?: number };
  score?: { importance?: number; level?: number };
  importance?: number;
  level?: number;
};

function mapSkillsPayload(data: unknown): { name: string; importance: number | null; level: number | null }[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as {
    element?: ElementRating[];
    skills?: ElementRating[];
    skill?: ElementRating[];
    occupation?: { skills?: ElementRating[]; skill?: ElementRating[]; element?: ElementRating[] };
  };
  const arr = d.element ?? d.skills ?? d.skill ?? d.occupation?.skills ?? d.occupation?.skill ?? d.occupation?.element ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 40).map((el) => ({
    name: el.element?.name ?? el.name ?? 'Skill',
    importance: el.importance ?? el.rating?.importance ?? el.score?.importance ?? null,
    level: el.level ?? el.rating?.level ?? el.score?.level ?? null,
  }));
}

export async function getOccupationSkills(onetCode: string) {
  const code = encodeURIComponent(onetCode.trim());
  try {
    // Fetch skills, abilities, and knowledge in parallel — all three are needed
    // so that Design (abilities: visualization, originality) and Research
    // (knowledge: Fine Arts, Science) axes get data.
    const [skillsRes, abilitiesRes, knowledgeRes] = await Promise.allSettled([
      onetGet<unknown>(`online/occupations/${code}/details/skills`, { sort: 'importance', start: 1, end: 30 }),
      onetGet<unknown>(`online/occupations/${code}/details/abilities`, { sort: 'importance', start: 1, end: 30 }),
      onetGet<unknown>(`online/occupations/${code}/details/knowledge`, { sort: 'importance', start: 1, end: 20 }),
    ]);

    const combined: { name: string; importance: number | null; level: number | null }[] = [];

    if (skillsRes.status === 'fulfilled') combined.push(...mapSkillsPayload(skillsRes.value));
    if (abilitiesRes.status === 'fulfilled') combined.push(...mapSkillsPayload(abilitiesRes.value));
    if (knowledgeRes.status === 'fulfilled') combined.push(...mapSkillsPayload(knowledgeRes.value));

    if (combined.length > 0) return combined;

    // Fallback to summary/skills only
    const summary = await onetGet<unknown>(`online/occupations/${code}/summary/skills`, { start: 1, end: 25 });
    return mapSkillsPayload(summary);
  } catch {
    return [];
  }
}

type TaskRow = { task?: string; incumbents_responding?: number };

export async function getOccupationTasks(onetCode: string): Promise<{ text: string; importance: number | null }[]> {
  const code = encodeURIComponent(onetCode.trim());
  try {
    const data = await onetGet<{ task?: TaskRow[]; occupation?: { task?: TaskRow[] } }>(
      `online/occupations/${code}/summary/tasks`
    );
    const tasks = data.task ?? data.occupation?.task ?? [];
    if (!Array.isArray(tasks)) return [];
    return tasks.slice(0, 25).map((t, i) => ({
      text: t.task ?? '',
      importance: t.incumbents_responding ?? null,
    }));
  } catch {
    return [];
  }
}

type TechRow = { name?: string; hot_technology?: boolean; category?: string };

export async function getOccupationTechnology(onetCode: string): Promise<{ name: string; category: string | null }[]> {
  const code = encodeURIComponent(onetCode.trim());
  try {
    const data = await onetGet<{ technology?: TechRow[]; occupation?: { technology?: TechRow[] } }>(
      `online/occupations/${code}/summary/technology_skills`
    );
    const tech = data.technology ?? data.occupation?.technology ?? [];
    if (!Array.isArray(tech)) return [];
    return tech.slice(0, 30).map((t) => ({
      name: t.name ?? '',
      category: t.category ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getRelatedOccupations(onetCode: string): Promise<{ code: string; title: string; relationship?: string }[]> {
  const code = encodeURIComponent(onetCode.trim());
  try {
    const data = await onetGet<{
      related_occupations?: { code: string; title: string }[];
      occupation?: { related_occupations?: { code: string; title: string }[] };
    }>(`online/occupations/${code}/summary/related_occupations`);
    const rel = data.related_occupations ?? data.occupation?.related_occupations ?? [];
    if (!Array.isArray(rel)) return [];
    return rel.slice(0, 15).map((r) => ({ code: r.code, title: r.title }));
  } catch {
    return [];
  }
}
