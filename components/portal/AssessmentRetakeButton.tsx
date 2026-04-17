'use client';

import { useState } from 'react';

export default function AssessmentRetakeButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/member/assessment/reset', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) { setError(data.error ?? 'Reset failed.'); setLoading(false); return; }
      setDone(true);
      // Reload so the assessment form shows
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError('We couldn\'t connect. Check your connection and try again.');
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p style={{ color: 'var(--color-green, #4a9b4f)', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>
        ✓ Reset complete — reloading…
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-outline btn-sm"
        style={{ color: 'var(--color-on-surface-variant)', borderColor: 'var(--outline-variant)' }}
      >
        Retake Assessment
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(173,44,77,0.06)', borderRadius: '0.625rem', border: '1px solid rgba(173,44,77,0.15)' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0, fontWeight: 600 }}>
        Are you sure you want to retake?
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
        Your previous score is saved and sent to your counselor. This allows you to take the assessment again.
      </p>
      {error && <p style={{ color: 'var(--color-accent)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={loading}
          className="btn btn-primary btn-sm"
          style={{ background: 'var(--color-accent)' }}
        >
          {loading ? 'Resetting…' : 'Yes, reset and retake'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="btn btn-outline btn-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
