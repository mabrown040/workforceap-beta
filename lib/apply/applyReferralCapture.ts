/** Session key for partner referral code from ?ref= on /apply */
export const APPLY_REFERRAL_SESSION_KEY = 'apply_partner_ref';

/**
 * Durable partner attribution cookie. Set by middleware on every `/enroll/*`
 * request (see middleware.ts) so a student who lands on a partner's
 * enrollment page keeps their attribution when the tab is closed, the link is
 * re-opened without the query string, or they finish applying days later.
 * `/api/apply/signup` falls back to this cookie when the request body carries
 * no `referralRef`.
 */
export const PARTNER_REF_COOKIE = 'wap_partner_ref';

/** 30 days — matches the member referral cookie in `app/r/[code]/route.ts`. */
export const PARTNER_REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Partner slugs/referral codes are lowercase alphanumeric with dashes. */
const PARTNER_REF_PATTERN = /^[a-z0-9-]{1,64}$/;

/**
 * Lowercases and validates a partner slug taken from a URL path segment.
 * Returns null for anything that is not a plausible slug so we never write
 * attacker-controlled text into a cookie.
 */
export function normalizePartnerRef(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const candidate = decodeSegment(raw).trim().toLowerCase();
  return PARTNER_REF_PATTERN.test(candidate) ? candidate : null;
}

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding — fall through to the raw value, which the
    // pattern check below will reject anyway.
    return raw;
  }
}
