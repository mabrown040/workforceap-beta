'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EmployerJobQuickActions({
  jobId,
  title,
  status,
}: {
  jobId: string;
  title: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'pause' | 'close' | null>(null);

  const showPause = status === 'live';
  const showClose = status === 'live' || status === 'approved';

  async function pause() {
    setBusy('pause');
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function closeJob() {
    setBusy('close');
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const btnStyle: React.CSSProperties = {
    flex: 1,
    textAlign: 'center',
    padding: '0.5rem',
    background: 'var(--surface-container)',
    color: 'var(--color-on-surface)',
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '1px solid var(--outline-variant)',
    cursor: busy ? 'wait' : 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link
          href={`/employer/jobs/${jobId}`}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: '0.375rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
          className="active:wa-scale-95 wa-transition-transform"
        >
          Edit
        </Link>
        {showPause && (
          <button
            type="button"
            style={btnStyle}
            disabled={!!busy}
            onClick={() => void pause()}
          >
            {busy === 'pause' ? '…' : 'Pause'}
          </button>
        )}
        {showClose && (
          <button
            type="button"
            style={btnStyle}
            disabled={!!busy}
            onClick={() => {
              if (confirm(`Close “${title}”? It will no longer be visible to candidates.`)) {
                void closeJob();
              }
            }}
          >
            {busy === 'close' ? '…' : 'Close'}
          </button>
        )}
      </div>
      <Link
        href={`/employer/jobs/${encodeURIComponent(jobId)}/applicants`}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '0.45rem',
          fontSize: '0.775rem',
          fontWeight: 600,
          color: 'var(--color-accent)',
          textDecoration: 'none',
        }}
      >
        Applications
      </Link>
    </div>
  );
}
