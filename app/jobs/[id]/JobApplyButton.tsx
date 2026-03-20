'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function JobApplyButton({ jobId }: { jobId: string }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setApplied(true);
      } else {
        if (res.status === 401) {
          setError('Please log in to apply.');
        } else {
          setError(data.error ?? 'Failed to apply');
        }
      }
    } catch {
      setError('Network error');
    } finally {
      setApplying(false);
    }
  }

  if (applied) {
    return (
      <div
        style={{
          padding: '1.5rem',
          background: 'rgba(74, 155, 79, 0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(74, 155, 79, 0.3)',
 textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--color-accent)', margin: 0 }}>
          Application submitted successfully!
        </p>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-gray-600)' }}>
          The employer will review your application and contact you.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
          }}
        >
          {error}
          {error === 'Please log in to apply.' && (
            <Link href={`/login?redirectTo=/jobs/${jobId}`} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>
              Log in
            </Link>
          )}
        </div>
      )}
      <button
        type="button"
        className="btn btn-accent btn-large"
        onClick={handleApply}
        disabled={applying}
      >
        {applying ? 'Applying…' : 'Apply for this job'}
      </button>
      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--color-gray-500)' }}>
        You must be logged in as a WorkforceAP member to apply.
      </p>
    </div>
  );
}
