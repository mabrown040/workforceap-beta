'use client';

import { useState } from 'react';
import { introduceMemberToEmployer } from './introduceAction';

export default function AdminMemberAiMatches({ memberId, matches }: { memberId: string; matches: any[] }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [introduced, setIntroduced] = useState<Record<string, boolean>>({});

  const handleIntroduce = async (matchId: string, jobId: string) => {
    setLoading((prev) => ({ ...prev, [matchId]: true }));
    try {
      await introduceMemberToEmployer(memberId, jobId);
      setIntroduced((prev) => ({ ...prev, [matchId]: true }));
    } catch (err) {
      console.error(err);
      alert('Failed to introduce member');
    }
    setLoading((prev) => ({ ...prev, [matchId]: false }));
  };

  if (!matches || matches.length === 0) return null;

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>AI Job Matches</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {matches.map((match) => (
          <div key={match.id} style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{match.job?.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                {match.job?.employer?.companyName ?? 'Employer'} • Score: {match.matchScore}%
              </div>
            </div>
            <button type="button"
              className="btn btn-primary"
              onClick={() => handleIntroduce(match.id, match.jobId)}
              disabled={loading[match.id] || introduced[match.id]}
            >
              {introduced[match.id] ? 'Introduced' : loading[match.id] ? 'Introducing...' : 'Introduce'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
