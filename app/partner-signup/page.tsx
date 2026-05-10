'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Canonical signup is on `/partners#partner-signup` (single self-service path). */
export default function PartnerSignupRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/partners#partner-signup');
  }, [router]);
  return (
    <div className="inner-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-on-surface-variant)' }}>Opening partner registration…</p>
    </div>
  );
}
