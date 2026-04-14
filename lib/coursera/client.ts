import 'server-only';

import { getCourseraConfig } from '@/lib/coursera/config';

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
};

export async function fetchCourseraLearnerSkillsetProgress(args: {
  programId: string;
  externalUserId?: string;
  email?: string;
  skillsetIds: string[];
}) {
  const config = getCourseraConfig();
  if (!config.apiToken) {
    throw new Error('Coursera API token is not configured');
  }

  const params = new URLSearchParams();
  if (args.externalUserId) params.append('externalUserId', args.externalUserId);
  if (args.email) params.append('email', args.email);
  for (const skillsetId of args.skillsetIds) {
    params.append('skillsetIds', skillsetId);
  }

  const response = await fetch(
    `${config.apiBaseUrl}/enterprise/programs/${encodeURIComponent(args.programId)}/skillsets/learner-progress?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Coursera API request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const pagination = payload.pagination && typeof payload.pagination === 'object'
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
      return [
        {
          skillsetId: typeof item.skillsetId === 'string' ? item.skillsetId : '',
          skillsetName: typeof item.skillsetName === 'string' ? item.skillsetName : 'Untitled skillset',
          progressPercent:
            typeof item.progressPercent === 'number' && Number.isFinite(item.progressPercent)
              ? Math.max(0, Math.min(100, Math.round(item.progressPercent)))
              : 0,
        },
      ].filter((candidate) => candidate.skillsetId);
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
