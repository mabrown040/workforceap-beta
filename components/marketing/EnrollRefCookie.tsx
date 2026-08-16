'use client';

import { useEffect } from 'react';
import { persistPartnerRef } from '@/lib/apply/applyReferralCapture';

/** Stamp the partner ref when a student lands on /enroll/[school] with no ?ref=. */
export default function EnrollRefCookie({ referralCode }: { referralCode: string }) {
  useEffect(() => {
    persistPartnerRef(referralCode);
  }, [referralCode]);
  return null;
}
