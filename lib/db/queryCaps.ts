/**
 * Hard caps for SSR / helper `findMany` scans that used to load thousands of rows.
 *
 * Pages should paginate or show "first N of M" when a cap truncates the set.
 * Do not multiply a per-partner/per-tenant page size by an unbounded count.
 */

/** Default admin/portal list page size. */
export const ADMIN_SSR_LIST_CAP = 200;

/** Employer candidate / pipeline list pages. */
export const EMPLOYER_LIST_CAP = 200;

/** Counselor roster, assignments, and helper scans scoped to a caseload. */
export const COUNSELOR_ROSTER_CAP = 500;

/** Per-member history (applications, matches, chat) on profile pages. */
export const MEMBER_HISTORY_CAP = 200;

/** Dropdown / catalog lookups (partners, subgroups, counselors, programs). */
export const LOOKUP_LIST_CAP = 500;

/** WIOA demographics sample used to build the report breakdown. */
export const WIOA_DEMOGRAPHICS_CAP = 500;

/** Admin analytics / growth event samples (not a full-cohort metric). */
export const ANALYTICS_SAMPLE_CAP = 500;

/** Refuse any list take at or above this — the old silent 5k/20k pattern. */
export const UNBOUNDED_LIST_TAKE_FLOOR = 5000;

export function clampTake(requested: number, cap: number): number {
  if (!Number.isFinite(requested) || requested < 1) return 1;
  return Math.min(Math.floor(requested), cap);
}

export function isListTruncated(fetched: number, cap: number, total?: number): boolean {
  if (total != null) return total > cap;
  return fetched >= cap;
}

export function showingFirstLabel(shown: number, total: number, noun: string): string {
  if (total <= shown) {
    return `Showing ${shown} ${noun}`;
  }
  return `Showing first ${shown} of ${total} ${noun}`;
}
