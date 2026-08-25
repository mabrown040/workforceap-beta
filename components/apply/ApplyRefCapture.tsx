'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  clearPersistedPartnerRef,
  persistPartnerRef,
} from '@/lib/apply/applyReferralCapture';

/**
 * Persist ?ref= for the apply funnel (signup attribution).
 * Bare `/apply` (no ref) clears client session/JS cookie so a prior school
 * visit cannot stamp Concordia (etc.) onto an organic WorkforceAP signup.
 */
export default function ApplyRefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) {
      persistPartnerRef(ref);
    } else {
      clearPersistedPartnerRef();
    }
  }, [searchParams]);
  return null;
}
