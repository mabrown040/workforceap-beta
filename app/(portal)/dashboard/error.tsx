'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function MemberPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="portal-error-fallback" style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
      <p style={{ color: 'var(--color-muted, #64748b)', marginBottom: '1.25rem' }}>
        The member portal hit an unexpected error. You can try again or return to your dashboard home.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/dashboard" className="btn btn-secondary">
          Back to dashboard
        </Link>
        <Link href="/" className="btn btn-ghost">
          WorkforceAP home
        </Link>
      </div>
    </div>
  );
}
