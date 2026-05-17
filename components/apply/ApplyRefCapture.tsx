'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';

/** Persist ?ref= partner code for the apply funnel (signup creates Application with attribution). */
export default function ApplyRefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams?.get('ref')?.trim().toLowerCase();
    if (!ref || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(APPLY_REFERRAL_SESSION_KEY, ref);
    } catch {
      /* ignore */
    }
  }, [searchParams]);
  return null;
}
