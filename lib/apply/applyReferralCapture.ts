/** Session key for partner referral code from ?ref= on /apply */
export const APPLY_REFERRAL_SESSION_KEY = 'apply_partner_ref';

/**
 * Durable partner attribution cookie. Set by middleware on top-level
 * navigations to `/enroll/<partner-slug>` (see middleware.ts) so a student who
 * lands on a partner's enrollment page keeps their attribution when the tab is
 * closed, the link is re-opened without the query string, or they finish
 * applying days later. `/api/apply/signup` falls back to this cookie when the
 * request body carries no `referralRef`, and clears it once consumed so the
 * next applicant on a shared device is not mis-attributed.
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

/** URL prefix for partner enrollment pages. */
const ENROLL_PATH_PREFIX = '/enroll/';

/**
 * Partner enrollment pages live at `/enroll/<partner-slug>` — the URL segment
 * IS the partner slug (see `lib/partners/chsPartner.ts`). Returns the
 * normalized slug when the path is one of those pages, else null.
 */
export function partnerRefFromEnrollPath(pathname: string): string | null {
  if (!pathname.startsWith(ENROLL_PATH_PREFIX)) return null;
  const slug = pathname.slice(ENROLL_PATH_PREFIX.length).split('/')[0];
  return normalizePartnerRef(slug);
}

/** Minimal `Headers`-shaped reader so this stays testable without a fetch env. */
type HeaderReader = { get(name: string): string | null };

/**
 * True when a request to `/enroll/<slug>` is a real top-level page visit and
 * may therefore plant the 30-day attribution cookie.
 *
 * WHY THIS GATE EXISTS: without it, any cross-site `<img src=".../enroll/x">`,
 * hidden iframe, `fetch()`, prefetch, or one-hop redirect silently forces
 * partner attribution for 30 days — which drives partner-portal PII
 * visibility, seat consumption against a sponsor's cap, and the school fields
 * written onto the member's profile. Attribution must be something the student
 * actually did, not something a third-party page did to them.
 *
 * Rules, strictest signal first:
 *  - Non-GET is never a page visit.
 *  - `Sec-Fetch-Dest` is the authoritative signal when present: only
 *    `document` is a top-level navigation. `iframe`/`image`/`empty` are
 *    exactly the embedding attacks above, so a present-but-different value is
 *    rejected rather than allowed through the `Sec-Fetch-Mode` check.
 *  - `Sec-Fetch-Mode: navigate` is accepted when `Sec-Fetch-Dest` is absent.
 *  - Older clients that send neither fall back to an `Accept` header that asks
 *    for HTML, which subresource loads do not send.
 */
export function shouldCaptureEnrollRef(method: string, headers: HeaderReader): boolean {
  if (method !== 'GET') return false;
  const dest = headers.get('sec-fetch-dest');
  if (dest) return dest.toLowerCase() === 'document';
  const mode = headers.get('sec-fetch-mode');
  if (mode) return mode.toLowerCase() === 'navigate';
  return (headers.get('accept') ?? '').toLowerCase().includes('text/html');
}
