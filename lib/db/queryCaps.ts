/**
 * Hard caps for SSR / cron `findMany` scans that used to load thousands of rows.
 *
 * Pages should paginate or show "first N of M" when a cap truncates the set.
 * Do not multiply a per-partner/per-tenant page size by an unbounded count.
 */

/** Default admin/portal list page size (Phase 3 / 16). */
export const ADMIN_SSR_LIST_CAP = 200;

/** Training-progress kit: learners loaded into the roster. */
export const TRAINING_PROGRESS_LEARNER_CAP = 200;

/**
 * Training-progress course_progress rows. Scoped to the learner page, then
 * hard-capped so a single learner with a huge history cannot hydrate 20k rows.
 */
export const TRAINING_PROGRESS_PROGRESS_CAP = 4000;

/** Training-progress primary enrollments for the learner page. */
export const TRAINING_PROGRESS_ENROLLMENT_CAP = TRAINING_PROGRESS_LEARNER_CAP;

/** Legacy training-progress Coursera / mapping scans. */
export const TRAINING_PROGRESS_LEGACY_SCAN_CAP = 2000;

/** Counselor roster counselor rows (already lean). */
export const COUNSELOR_ROSTER_CAP = 500;

/** Employer pipeline / matches / bulk-action ID lists. */
export const EMPLOYER_LIST_CAP = 200;

/** Weekly partner digest: partners notified in one run. */
export const PARTNER_DIGEST_PARTNER_CAP = 500;

/**
 * Weekly partner digest: referral rows across ALL partners in one query.
 * Must stay a constant — never `N * partnerCount`.
 */
export const PARTNER_DIGEST_REFERRAL_CAP = 2000;

/** Refuse any list take at or above this — the old silent 5k/20k pattern. */
export const UNBOUNDED_LIST_TAKE_FLOOR = 5000;

export function clampTake(requested: number, cap: number): number {
  if (!Number.isFinite(requested) || requested < 1) return 1;
  return Math.min(Math.floor(requested), cap);
}

/**
 * Digest referral `take`. Ignores partner count on purpose so a 200-partner
 * week cannot request 400k rows.
 */
export function partnerDigestReferralTake(_partnerCount: number): number {
  return PARTNER_DIGEST_REFERRAL_CAP;
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
