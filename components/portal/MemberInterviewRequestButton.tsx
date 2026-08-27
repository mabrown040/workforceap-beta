'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberInterviewRequestButton({
  preview = false,
}: {
  /** Proofs: show the kit CTA without POSTing `/api/member/interview-request`. */
  preview?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    if (preview) {
      setDone(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/member/interview-request', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Request failed');
        setLoading(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError('Request failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p role="status" aria-live="polite" style={{ color: 'var(--wa-text)', margin: 0, fontSize: 'var(--wa-type-body)', fontWeight: 600 }}>
        Interview request sent. A counselor will follow up.
      </p>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" style={{ margin: '0 0 8px', fontSize: 'var(--wa-type-meta)', color: 'var(--wa-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="wa-kit-cta wa-kit-focus hover:wa-opacity-90"
        disabled={loading}
        onClick={() => void submit()}
        aria-busy={loading}
        style={{ cursor: loading ? 'wait' : 'pointer' }}
      >
        <span aria-live="polite">{loading ? 'Sending…' : 'Request interview'}</span>
      </button>
      <p style={{ fontSize: 'var(--wa-type-meta)', color: 'var(--wa-muted)', marginTop: 8, lineHeight: 1.5 }}>
        Opens scheduling by email — a counselor will follow up.
      </p>
    </div>
  );
}
