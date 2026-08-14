'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { persistPartnerRef } from '@/lib/apply/applyReferralCapture';

/** Persist ?ref= partner code for the apply funnel (signup creates Application with attribution). */
export default function ApplyRefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams?.get('ref');
    persistPartnerRef(ref);
  }, [searchParams]);
  return null;
}
