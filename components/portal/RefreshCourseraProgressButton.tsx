'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Manual "Refresh from Coursera" button. Bypasses the 60s server cache
 * by calling /api/member/coursera/refresh-progress (which invalidates
 * the per-learner cache key) and then refreshes the route so the
 * server component re-fetches and re-renders. Useful when a learner
 * just finished a course and wants to see it reflected immediately.
 */
export default function RefreshCourseraProgressButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/member/coursera/refresh-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Refresh failed');
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {error && (
        <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--color-error, #c83232)' }}>
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={busy || isPending}
        aria-busy={busy || isPending}
        className="btn btn-outline"
        style={{
          fontSize: '0.8125rem',
          padding: '0.35rem 0.75rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '1rem',
            animation: busy || isPending ? 'spin 1s linear infinite' : undefined,
          }}
          aria-hidden="true"
        >
          refresh
        </span>
        <span aria-live="polite">
          {busy || isPending ? 'Refreshing…' : 'Refresh from Coursera'}
        </span>
      </button>
    </span>
  );
}
