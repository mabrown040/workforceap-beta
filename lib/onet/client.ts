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

async function onetGet<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
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
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 250));
    return onetGet<T>(path, query);
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
  const data = await onetGet<SearchResp>('online/search', { keyword: q, end: 25 });
  if (data.error) throw new Error(data.error);
  return (data.occupation ?? []).map((o) => ({ code: o.code, title: o.title }));
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
  try {
    const data = await onetGet<Ov>(`online/occupations/${encodeURIComponent(code)}/`);
    if (data.error) return null;
    const o = data.occupation;
    if (!o) return null;
    return {
      code: o.code,
      title: o.title,
      description: o.description,
      tags: o.tags,
    };
  } catch {
    return null;
  }
}

type ElementRating = {
  id?: string;
  name?: string;
  title?: string;
  element?: { name?: string };
  rating?:
    | { importance?: number; level?: number }
    | Array<{ scale_id?: string; scale?: string; id?: string; value?: number | string | null }>;
  score?:
    | { importance?: number; level?: number }
    | Array<{ scale_id?: string; scale?: string; id?: string; value?: number | string | null }>;
  importance?: number;
  level?: number;
};

function pickScaleValue(
  source: ElementRating['rating'] | ElementRating['score'] | undefined,
  scaleHints: string[]
): number | null {
  if (!source) return null;
  if (!Array.isArray(source)) return null;
  const normalizedHints = new Set(scaleHints.map((hint) => hint.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const match = source.find((row) => {
    const scale = (row.scale_id ?? row.scale ?? row.id ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedHints.has(scale);
  });
  if (!match) return null;
  const raw = match.value;
  const parsed = typeof raw === 'string' ? Number(raw) : raw;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

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
  return arr.slice(0, 25).map((el) => ({
    name: el.element?.name ?? el.name ?? el.title ?? 'Skill',
    importance:
      el.importance ??
      (Array.isArray(el.rating) ? null : el.rating?.importance) ??
      (Array.isArray(el.score) ? null : el.score?.importance) ??
      pickScaleValue(el.rating, ['im', 'importance']) ??
      pickScaleValue(el.score, ['im', 'importance']),
    level:
      el.level ??
      (Array.isArray(el.rating) ? null : el.rating?.level) ??
      (Array.isArray(el.score) ? null : el.score?.level) ??
      pickScaleValue(el.rating, ['lv', 'level']) ??
      pickScaleValue(el.score, ['lv', 'level']),
  }));
}

export async function getOccupationSkills(onetCode: string) {
  const code = encodeURIComponent(onetCode.trim());
  try {
    const data = await onetGet<unknown>(`online/occupations/${code}/summary/skills`);
    return mapSkillsPayload(data);
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
