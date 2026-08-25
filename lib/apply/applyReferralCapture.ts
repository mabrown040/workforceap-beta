import {
  APPLY_REFERRAL_COOKIE,
  normalizePartnerRef,
  readReferralCookieFromDocument,
  writeReferralCookieOnDocument,
} from '@/lib/partner/sponsoredEnrollment';

/** Session key for partner referral code from ?ref= on /apply */
export const APPLY_REFERRAL_SESSION_KEY = 'apply_partner_ref';

export { APPLY_REFERRAL_COOKIE, normalizePartnerRef };

/**
 * Durable partner attribution cookie. Same name as APPLY_REFERRAL_COOKIE
 * (`wap_partner_ref`). Middleware plants it httpOnly on `/enroll/<slug>`;
 * `/api/apply/signup` falls back to it when the body has no `referralRef`,
 * then clears it so the next applicant on a shared device is not mis-attributed.
 */
export const PARTNER_REF_COOKIE = APPLY_REFERRAL_COOKIE;

/** 30 days — matches the member referral cookie in `app/r/[code]/route.ts`. */
export const PARTNER_REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Landing `/apply` may open the school wizard only from an explicit `?ref=`.
 * A leftover `wap_partner_ref` cookie (e.g. after `/enroll/concordia` on a
 * family or lab device) must not silently turn organic WorkforceAP apply into
 * Concordia (or any other school) attribution.
 *
 * Mid-funnel pages (`/apply/results`, `/apply/create-account`) and signup
 * still read the cookie — those run after a prior `?ref=` (or enroll CTA)
 * planted it for the same applicant.
 */
export function partnerRefForApplyLanding(
  queryRef: string | null | undefined,
): string | null {
  return normalizePartnerRef(queryRef);
}

/** Cookie clear attrs must match middleware plant (httpOnly + sameSite + secure). */
export function partnerRefCookieClearOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: 0;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}

/** Persist a partner ref in sessionStorage (and a first-party cookie for JS). */
export function persistPartnerRef(raw: string | null | undefined): string | null {
  const ref = normalizePartnerRef(raw);
  if (!ref || typeof window === 'undefined') return null;
  try {
    sessionStorage.setItem(APPLY_REFERRAL_SESSION_KEY, ref);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    writeReferralCookieOnDocument(ref);
  } catch {
    /* ignore */
  }
  return ref;
}

/** Read the captured partner ref: sessionStorage first, then the JS cookie. */
export function readPersistedPartnerRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = normalizePartnerRef(sessionStorage.getItem(APPLY_REFERRAL_SESSION_KEY));
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  return readReferralCookieFromDocument();
}

export function clearPersistedPartnerRef(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(APPLY_REFERRAL_SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${APPLY_REFERRAL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

/** URL prefix for partner enrollment pages. */
const ENROLL_PATH_PREFIX = '/enroll/';

/**
 * Partner enrollment pages live at `/enroll/<partner-slug>`.
 * `concordia-high-school` shortens to `/enroll/concordia`; a slug that is
 * already `concordia` is the segment. Returns the normalized segment or null.
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
 * Without this gate, any cross-site `<img src=".../enroll/x">`, hidden iframe,
 * `fetch()`, prefetch, or one-hop redirect silently forces partner attribution
 * for 30 days.
 */
export function shouldCaptureEnrollRef(method: string, headers: HeaderReader): boolean {
  if (method !== 'GET') return false;
  const dest = headers.get('sec-fetch-dest');
  if (dest) return dest.toLowerCase() === 'document';
  const mode = headers.get('sec-fetch-mode');
  if (mode) return mode.toLowerCase() === 'navigate';
  return (headers.get('accept') ?? '').toLowerCase().includes('text/html');
}
