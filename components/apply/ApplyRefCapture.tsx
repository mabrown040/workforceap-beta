'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';

type ApplyRefCaptureProps = {
  /**
   * Referral code to persist when the URL carries no `?ref=`.
   *
   * Used by the partner enrollment page (`/enroll/[partnerSlug]`), whose URL
   * has no query string: the partner is the route itself. Middleware plants
   * the durable `wap_partner_ref` cookie only on real top-level navigations
   * (`sec-fetch-dest: document`), so a Next client-side navigation into that
   * route gets no cookie. Every CTA on the page already carries `?ref=` — this
   * is the belt-and-braces second path, mounted on the page itself.
   *
   * The URL always wins: a NON-EMPTY `?ref=` is the student's actual link.
   * `?ref=` present but empty is not a choice, it is a stripped query string
   * (a link shortener, a copy/paste, a redirect), so it falls through to this
   * fallback — `??` would have treated the empty string as an explicit value
   * and silently dropped the partner.
   */
  fallbackRef?: string | null;
};

/** Persist ?ref= partner code for the apply funnel (signup creates Application with attribution). */
export default function ApplyRefCapture({ fallbackRef }: ApplyRefCaptureProps = {}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const fromUrl = searchParams?.get('ref')?.trim();
    const ref = (fromUrl || fallbackRef || '').trim().toLowerCase();
    if (!ref || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(APPLY_REFERRAL_SESSION_KEY, ref);
    } catch {
      /* ignore */
    }
  }, [searchParams, fallbackRef]);
  return null;
}
