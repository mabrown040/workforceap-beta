import 'server-only';

import { getCourseraConfig } from '@/lib/coursera/config';
import { getCourseraAccessToken } from '@/lib/coursera/oauth';

export type CourseraLearnerSkillsetProgress = {
  learnerName: string | null;
  learnerEmail: string | null;
  learnerExternalUserId: string | null;
  elements: Array<{
    skillsetId: string;
    skillsetName: string;
    progressPercent: number;
  }>;
  pagination: {
    total: number;
    nextPage: string | null;
    nextPageLink: string | null;
  } | null;
  /** Present when multiple learner-progress pages were fetched. */
  pagesFetched?: number;
};

type SkillsetRow = CourseraLearnerSkillsetProgress['elements'][number];

function mergeSkillsetElements(existing: SkillsetRow[], incoming: SkillsetRow[]): SkillsetRow[] {
  const map = new Map(existing.map((e) => [e.skillsetId, e]));
  for (const e of incoming) {
    const prev = map.get(e.skillsetId);
    if (!prev || e.progressPercent > prev.progressPercent) map.set(e.skillsetId, e);
  }
  return [...map.values()];
}

function resolveNextPageUrl(link: string | null | undefined, apiBaseUrl: string): string | null {
  if (!link?.trim()) return null;
  const t = link.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  try {
    const base = new URL(apiBaseUrl);
    if (t.startsWith('/')) return `${base.origin}${t}`;
    return new URL(t, `${base.origin}/`).toString();
  } catch {
    return null;
  }
}

function normalizePayload(payload: Record<string, unknown>): CourseraLearnerSkillsetProgress {
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const pagination =
    payload.pagination && typeof payload.pagination === 'object'
      ? (payload.pagination as Record<string, unknown>)
      : null;

  const normalized: CourseraLearnerSkillsetProgress = {
    learnerName: typeof payload.learnerName === 'string' ? payload.learnerName : null,
    learnerEmail: typeof payload.learnerEmail === 'string' ? payload.learnerEmail : null,
    learnerExternalUserId:
      typeof payload.learnerExternalUserId === 'string' ? payload.learnerExternalUserId : null,
    elements: elements.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const skillsetId = typeof item.skillsetId === 'string' ? item.skillsetId : '';
      if (!skillsetId) return [];
      return [
        {
          skillsetId,
          skillsetName: typeof item.skillsetName === 'string' ? item.skillsetName : 'Untitled skillset',
          progressPercent:
            typeof item.progressPercent === 'number' && Number.isFinite(item.progressPercent)
              ? Math.max(0, Math.min(100, Math.round(item.progressPercent)))
              : 0,
        },
      ];
    }),
    pagination: pagination
      ? {
          total: typeof pagination.total === 'number' ? pagination.total : 0,
          nextPage: typeof pagination.nextPage === 'string' ? pagination.nextPage : null,
          nextPageLink: typeof pagination.nextPageLink === 'string' ? pagination.nextPageLink : null,
        }
      : null,
  };

  return normalized;
}

const MAX_PROGRESS_PAGES = 40;

export async function fetchCourseraLearnerSkillsetProgress(args: {
  programId: string;
  externalUserId?: string;
  email?: string;
  skillsetIds: string[];
}) {
  const config = getCourseraConfig();
  const accessToken = await getCourseraAccessToken();

  const params = new URLSearchParams();
  if (args.externalUserId) params.append('externalUserId', args.externalUserId);
  if (args.email) params.append('email', args.email);
  for (const skillsetId of args.skillsetIds) {
    params.append('skillsetIds', skillsetId);
  }

  let fetchUrl: string | null = `${config.apiBaseUrl}/enterprise/programs/${encodeURIComponent(args.programId)}/skillsets/learner-progress?${params.toString()}`;
  let mergedElements: SkillsetRow[] = [];
  let learnerName: string | null = null;
  let learnerEmail: string | null = null;
  let learnerExternalUserId: string | null = null;
  let lastPagination: CourseraLearnerSkillsetProgress['pagination'] = null;
  let pages = 0;

  while (fetchUrl && pages < MAX_PROGRESS_PAGES) {
    pages += 1;
    const response = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      throw new Error(`Coursera API request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const page = normalizePayload(payload);

    learnerName = learnerName ?? page.learnerName;
    learnerEmail = learnerEmail ?? page.learnerEmail;
    learnerExternalUserId = learnerExternalUserId ?? page.learnerExternalUserId;
    mergedElements = mergeSkillsetElements(mergedElements, page.elements);
    lastPagination = page.pagination;
    fetchUrl = resolveNextPageUrl(page.pagination?.nextPageLink ?? null, config.apiBaseUrl);
  }

  return {
    learnerName,
    learnerEmail,
    learnerExternalUserId,
    elements: mergedElements,
    pagination: lastPagination,
    pagesFetched: pages,
  };
}
