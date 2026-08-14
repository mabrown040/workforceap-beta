import {
  APPLY_REFERRAL_COOKIE,
  normalizePartnerRef,
  readReferralCookieFromDocument,
  writeReferralCookieOnDocument,
} from '@/lib/partner/sponsoredEnrollment';

/** Session key for partner referral code from ?ref= on /apply */
export const APPLY_REFERRAL_SESSION_KEY = 'apply_partner_ref';

export { APPLY_REFERRAL_COOKIE };

/** Persist a partner ref in sessionStorage and a first-party cookie. */
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

/** Read the captured partner ref: sessionStorage first, then the cookie. */
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
}
