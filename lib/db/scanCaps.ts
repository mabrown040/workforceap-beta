/**
 * Hard caps for leftover cron / analytics / cohort Prisma scans.
 *
 * Lives in this module (not `lib/db/queryCaps.ts`) so this branch does not
 * collide with `cursor/cap-remaining-takes-942e`, which owns SSR list takes.
 *
 * Official WIOA / board / funder headline totals must use SQL aggregation
 * (`count`, `groupBy`, `$queryRaw`). These caps apply to hydrated samples,
 * work-queue pages, and incremental sync windows — never as a silent
 * substitute for a required exact count.
 */

/** Hydrated sample for admin charts / health buckets (not a WIOA total). */
export const ANALYTICS_SAMPLE_CAP = 500;

/** Date-windowed cohort detail rows used to compute JS catalog completions. */
export const ANALYTICS_COHORT_DETAIL_CAP = 500;

/** Funder / board placement & member lists shown in a report. */
export const REPORT_SAMPLE_CAP = 200;

/** Stale-application / match-candidate work queues. */
export const WORK_QUEUE_CAP = 200;

/** Catalog / mapping lookups (programs, quiz rules, O*NET maps). */
export const LOOKUP_CATALOG_CAP = 500;

/** Per-member history (course slugs, skillsets). */
export const MEMBER_PROGRESS_CAP = 100;

/**
 * Coursera B4B enrollment-report rows processed in one cron run.
 * `syncCourseraB4BEnrollmentReports` resumes from `nextStart` stored on the
 * last successful `cron_coursera_b4b_sync` workflowDiagnostic.
 */
export const COURSERA_B4B_REPORT_CAP = 400;

/** Users resolved by email for one B4B report page (chunked if larger). */
export const COURSERA_B4B_USER_LOOKUP_CAP = 400;

/**
 * O*NET occupations refreshed in one `syncTopMappedOccupations` run.
 * Next run continues with the oldest / never-synced codes (updatedAt ASC,
 * NULLS FIRST) so the catalog eventually completes without a 5k hydrate.
 */
export const ONET_SYNC_OCCUPATION_CAP = 25;

/** Cron work-queue rows (alerts, surveys) scoped to an already-capped candidate set. */
export const CRON_SCOPED_LOOKUP_CAP = 500;

/** Refuse any leftover list take at or above this — the old silent 5k/10k/20k pattern. */
export const UNBOUNDED_SCAN_TAKE_FLOOR = 5000;

export function clampScanTake(requested: number, cap: number): number {
  if (!Number.isFinite(requested) || requested < 1) return 1;
  return Math.min(Math.floor(requested), cap);
}

export function sqlCount(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'bigint' ? Number(value) : value;
}
