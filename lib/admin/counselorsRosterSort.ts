import type { CounselorRow } from '@/components/portal/kit/pages/admin-subviews/CounselorsRosterKit';

export const COUNSELOR_SORT_KEYS = [
  'name',
  'caseload',
  'atRisk',
  'placements',
  'avgResponse',
  'load',
] as const;

export type CounselorSortKey = (typeof COUNSELOR_SORT_KEYS)[number];
export type CounselorSortDirection = 'asc' | 'desc';

export const DEFAULT_COUNSELOR_SORT_KEY: CounselorSortKey = 'caseload';
export const DEFAULT_COUNSELOR_SORT_DIRECTION: CounselorSortDirection = 'desc';

const LOAD_RANK: Record<CounselorRow['load'], number> = {
  Over: 0,
  Balanced: 1,
  Light: 2,
};

/** Parse captions like "2.1h" or "45m" into minutes for ordering; unknown → null. */
function responseMinutes(caption: string): number | null {
  const trimmed = caption.trim();
  if (!trimmed || trimmed === '—') return null;
  const hours = trimmed.match(/^([\d.]+)h$/i);
  if (hours) return Math.round(parseFloat(hours[1]) * 60);
  const minutes = trimmed.match(/^([\d.]+)m$/i);
  if (minutes) return Math.round(parseFloat(minutes[1]));
  return null;
}

function compareOn(a: CounselorRow, b: CounselorRow, key: CounselorSortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'caseload':
      return a.caseload - b.caseload;
    case 'atRisk':
      return a.atRisk - b.atRisk;
    case 'placements':
      return a.placements - b.placements;
    case 'load':
      return LOAD_RANK[a.load] - LOAD_RANK[b.load];
    case 'avgResponse':
      return 0;
    default:
      return 0;
  }
}

export function sortCounselorRows<T extends CounselorRow>(
  rows: readonly T[],
  key: CounselorSortKey,
  direction: CounselorSortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'avgResponse') {
      const ra = responseMinutes(a.avgResponse);
      const rb = responseMinutes(b.avgResponse);
      if (ra == null && rb == null) return a.id.localeCompare(b.id);
      if (ra == null) return 1;
      if (rb == null) return -1;
      if (ra !== rb) return (ra - rb) * sign;
      return a.id.localeCompare(b.id);
    }
    const primary = compareOn(a, b, key);
    if (primary !== 0) return primary * sign;
    return a.id.localeCompare(b.id);
  });
}
