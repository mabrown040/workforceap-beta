'use client';

import { useEffect } from 'react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <div style={{ padding: '2rem', maxWidth: '28rem', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Something went wrong</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {error.digest
          ? `An error occurred. Try again, or contact info@workforceap.org with reference ${error.digest}.`
          : 'An error occurred. Try again, or contact info@workforceap.org if it keeps happening.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}