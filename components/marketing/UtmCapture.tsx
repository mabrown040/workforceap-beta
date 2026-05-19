'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { UTM_SESSION_KEYS } from '@/lib/marketing/utmCapture';

/**
 * Captures UTM parameters and `document.referrer` into sessionStorage so
 * that the eventual signup POST can attribute conversion to the channel
 * that drove the visit.
 *
 * Render-only. Sibling of `<ApplyRefCapture>`; both should be mounted on
 * any ad-landable page (apply, signup, login). Idempotent — only writes
 * keys that are present in the URL, so we never overwrite a deeper-funnel
 * value with empty data from a downstream page.
 *
 * Referrer is captured only when it points outside our origin (so internal
 * page-to-page navigation doesn't clobber the ad-source referrer).
 */
export default function UtmCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const writeIfPresent = (key: string, value: string | null | undefined) => {
        const v = value?.trim();
        if (!v) return;
        sessionStorage.setItem(key, v.slice(0, 200));
      };
      writeIfPresent(UTM_SESSION_KEYS.source, searchParams?.get('utm_source'));
      writeIfPresent(UTM_SESSION_KEYS.medium, searchParams?.get('utm_medium'));
      writeIfPresent(UTM_SESSION_KEYS.campaign, searchParams?.get('utm_campaign'));
      writeIfPresent(UTM_SESSION_KEYS.content, searchParams?.get('utm_content'));
      writeIfPresent(UTM_SESSION_KEYS.term, searchParams?.get('utm_term'));

      // Only capture referrer if it's the first page hit AND points off-origin.
      // Re-capturing on every page would overwrite the original ad referrer
      // with the most recent internal page.
      const hasReferrerCaptured = !!sessionStorage.getItem(UTM_SESSION_KEYS.referrer);
      if (!hasReferrerCaptured && document.referrer) {
        try {
          const ref = new URL(document.referrer);
          if (ref.origin !== window.location.origin) {
            sessionStorage.setItem(UTM_SESSION_KEYS.referrer, document.referrer.slice(0, 500));
          }
        } catch {
          /* malformed referrer — ignore */
        }
      }
    } catch {
      /* sessionStorage unavailable (private mode) — silent no-op */
    }
  }, [searchParams]);
  return null;
}
