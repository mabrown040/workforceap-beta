'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    void (async () => {
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
    })();
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!milestones) return <p style={{ color: 'var(--color-gray-600)' }}>Loading milestones…</p>;
  if (milestones.length === 0) {
    return <p style={{ color: 'var(--color-gray-600)' }}>No milestones in this window yet.</p>;
  }

  return (
    <ul className="partner-milestones-feed">
      {milestones.map((m) => (
        <li key={m.id} className="partner-milestone-row">
          <div>
            <span className="partner-milestone-kind">{m.kind}</span>
            <div className="partner-milestone-label">{m.label}</div>
            <div className="partner-milestone-meta">
              <Link href={`/partner/members/${m.memberId}`}>{m.memberName}</Link>
              <span> · {new Date(m.at).toLocaleString()}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
