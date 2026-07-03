'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Milestone = {
  id: string;
  kind: string;
  label: string;
  memberId: string;
  memberName: string;
  at: string;
};

export default function PartnerMilestonesView() {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch('/api/partner/milestones', { credentials: 'include' });
      if (!r.ok) {
        setError('Could not load milestones');
        return;
      }
      const data = (await r.json()) as { milestones: Milestone[] };
      setMilestones(data.milestones);
    } catch {
      setError('Could not load milestones');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div role="alert" className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>{error}</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }
  if (!milestones) return <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading milestones…</p>;
  if (milestones.length === 0) {
    return (
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}
          aria-hidden="true"
        >
          flag
        </span>
        <p style={{ color: 'var(--color-on-surface)', fontWeight: 600, marginBottom: '0.25rem' }}>No milestones yet</p>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
          Milestones will appear here as your members progress through training.
        </p>
      </div>
    );
  }

  return (
    <ul className="partner-milestones-feed">
      {milestones.map((m) => (
        <li key={m.id} className="partner-milestone-row">
          <div>
            <span className="partner-milestone-kind">{m.kind}</span>
            <div className="partner-milestone-label">{m.label}</div>
            <div className="partner-milestone-meta">
              <Link href={`/partner/referred-members/${m.memberId}`}>{m.memberName}</Link>
              <span> · {new Date(m.at).toLocaleString()}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
