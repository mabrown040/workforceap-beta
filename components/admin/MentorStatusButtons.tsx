'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Action = 'approve' | 'deactivate' | 'activate';

/**
 * PATCH /api/admin/mentors/[id] — uses the same session cookies as other portal API routes
 * (avoids server-action cookie edge cases in some deployments).
 */
export default function MentorStatusButtons({
  mentorId,
  approvedAt,
  isActive,
}: {
  mentorId: string;
  approvedAt: Date | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action: Action) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/mentors/${mentorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'same-origin',
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!approvedAt ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('approve')}
            style={{
              border: 0,
              borderRadius: '0.45rem',
              padding: '0.45rem 0.7rem',
              background: 'var(--color-accent)',
              color: '#fff',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            Approve
          </button>
        ) : null}
        {approvedAt && isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('deactivate')}
            style={{
              border: 0,
              borderRadius: '0.45rem',
              padding: '0.45rem 0.7rem',
              background: '#a91b3f',
              color: '#fff',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            Deactivate
          </button>
        ) : null}
        {approvedAt && !isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('activate')}
            style={{
              border: '1px solid var(--outline-variant)',
              borderRadius: '0.45rem',
              padding: '0.45rem 0.7rem',
              background: 'var(--surface-container-highest)',
              color: 'var(--color-on-surface)',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            Activate
          </button>
        ) : null}
      </div>
      {error ? (
        <span style={{ fontSize: '0.75rem', color: '#b91c1c' }} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
