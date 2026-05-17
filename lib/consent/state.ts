/**
 * Client-side consent state used by the cookie banner and any analytics
 * loaders that should respect the user's choice.
 *
 * Source of truth is `localStorage[wap-cookie-consent]`. We also broadcast
 * a `wap:consent-change` CustomEvent so multiple listeners (e.g. the banner
 * and a future GTM consent-update hook) can react without polling.
 *
 * Why localStorage and not a cookie: this is a client-only signal that
 * gates client-side script loading. Server-side decisions about consent
 * happen via the GDPR consent API and the authenticated user record.
 */

export const COOKIE_CONSENT_KEY = 'wap-cookie-consent';
export const CONSENT_EVENT = 'wap:consent-change';

export type ConsentDecision = 'accepted' | 'declined' | 'unset';

export type ConsentRecord = {
  decision: ConsentDecision;
  date: string;
  /** True when the decision was set automatically because Global Privacy Control was detected. */
  fromGpc?: boolean;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function detectGpc(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true;
}

export function readConsent(): ConsentRecord {
  if (!isBrowser()) return { decision: 'unset', date: '' };
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return { decision: 'unset', date: '' };
    const parsed = JSON.parse(raw) as Partial<ConsentRecord> & { accepted?: boolean };
    if (typeof parsed.decision === 'string') {
      return {
        decision: parsed.decision,
        date: parsed.date ?? '',
        fromGpc: parsed.fromGpc,
      };
    }
    // Legacy shape: { accepted: boolean, date: string }.
    if (typeof parsed.accepted === 'boolean') {
      return {
        decision: parsed.accepted ? 'accepted' : 'declined',
        date: parsed.date ?? '',
      };
    }
    return { decision: 'unset', date: '' };
  } catch {
    return { decision: 'unset', date: '' };
  }
}

export function writeConsent(decision: 'accepted' | 'declined', opts: { fromGpc?: boolean } = {}) {
  if (!isBrowser()) return;
  const record: ConsentRecord = {
    decision,
    date: new Date().toISOString(),
    ...(opts.fromGpc ? { fromGpc: true } : {}),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
}

export function subscribeConsent(listener: (record: ConsentRecord) => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ConsentRecord>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/**
 * Push a Google Consent Mode v2 update so GTM-loaded tags honor the
 * decision. Safe to call before gtag exists — we initialize the queue.
 */
export function pushConsentToGtag(decision: 'accepted' | 'declined') {
  if (typeof window === 'undefined') return;
  type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  const w = window as GtagWindow;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== 'function') {
    w.gtag = function gtag(...args: unknown[]) {
      (w.dataLayer as unknown[]).push(args);
    };
  }
  const value = decision === 'accepted' ? 'granted' : 'denied';
  w.gtag('consent', 'update', {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}
