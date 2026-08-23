/**
 * Hard caps for cron `findMany` scans. Keep these in this module (not
 * `lib/db/queryCaps`) so this branch does not collide with the fail-closed
 * list-cap PR.
 */

/** Inactive / inactivity nudge candidates emailed in one run. */
export const CRON_NUDGE_CANDIDATE_CAP = 200;

/** Weekly partner digest: partners considered in one run. */
export const CRON_PARTNER_DIGEST_PARTNER_CAP = 500;

/**
 * Weekly partner digest: referral rows across ALL partners in one query.
 * Must stay a constant — never `N * partnerCount`.
 */
export const CRON_PARTNER_DIGEST_REFERRAL_CAP = 2000;

/** Daily job-expiry rows flipped in one run. */
export const CRON_JOB_EXPIRY_CAP = 200;

/** Hourly Coursera auto-heal unmatched / error events. */
export const COURSERA_HEAL_UNMATCHED_CAP = 200;

/** Hourly Coursera auto-heal ignored-but-now-mapped events. */
export const COURSERA_HEAL_IGNORED_CAP = 150;

export function partnerDigestReferralTake(_partnerCount: number): number {
  return CRON_PARTNER_DIGEST_REFERRAL_CAP;
}
