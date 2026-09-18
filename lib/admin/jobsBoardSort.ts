import type { JobDisplayStatus, JobRow } from '@/components/portal/kit/pages/admin-subviews/JobsBoardKit';

export const JOB_SORT_KEYS = ['role', 'employer', 'location', 'wage', 'applicants', 'status'] as const;
export type JobSortKey = (typeof JOB_SORT_KEYS)[number];
export type JobSortDirection = 'asc' | 'desc';

export const DEFAULT_JOB_SORT_KEY: JobSortKey = 'role';
export const DEFAULT_JOB_SORT_DIRECTION: JobSortDirection = 'asc';

const STATUS_RANK: Record<JobDisplayStatus, number> = {
  Pending: 0,
  Draft: 1,
  Open: 2,
  Closing: 3,
  Filled: 4,
  Closed: 5,
};

function wageValue(wage: string): number | null {
  const match = wage.match(/\$?\s*([\d,]+)/);
  if (!match) return null;
  const n = Number.parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function compareOn(a: JobRow, b: JobRow, key: JobSortKey): number {
  switch (key) {
    case 'role':
      return a.role.localeCompare(b.role);
    case 'employer':
      return a.employer.localeCompare(b.employer);
    case 'location':
      return a.location.localeCompare(b.location);
    case 'applicants':
      return a.applicants - b.applicants;
    case 'status':
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    case 'wage':
      return 0;
    default:
      return 0;
  }
}

export function sortJobRows(
  rows: readonly JobRow[],
  key: JobSortKey,
  direction: JobSortDirection,
): JobRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'wage') {
      const wa = wageValue(a.wage);
      const wb = wageValue(b.wage);
      if (wa == null && wb == null) return a.id.localeCompare(b.id);
      if (wa == null) return 1;
      if (wb == null) return -1;
      if (wa !== wb) return (wa - wb) * sign;
      return a.id.localeCompare(b.id);
    }
    const primary = compareOn(a, b, key);
    if (primary !== 0) return primary * sign;
    return a.id.localeCompare(b.id);
  });
}
