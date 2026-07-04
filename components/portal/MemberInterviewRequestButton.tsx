'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberInterviewRequestButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
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
      <p role="status" aria-live="polite" style={{ color: 'var(--color-on-surface)', margin: 0 }}>
        Interview request sent. A counselor will follow up.
      </p>
    );
  }

  return (
    <div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void submit()} aria-busy={loading}>
        <span aria-live="polite">
          {loading ? 'Sending…' : 'Request interview'}
        </span>
      </button>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem' }}>
        Opens scheduling by email on our side — you’ll hear from a counselor.
      </p>
    </div>
  );
}
