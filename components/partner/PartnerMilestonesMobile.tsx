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

export default function PartnerMilestonesMobile() {
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/partner/milestones', { credentials: 'include' });
        if (!r.ok) { setError('Could not load milestones'); return; }
        const data = (await r.json()) as { milestones: Milestone[] };
        setMilestones(data.milestones);
      } catch {
        setError('Could not load milestones');
      }
    })();
  }, []);

  if (error) return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>{error}</p>
    </div>
  );

  if (!milestones) return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>Loading milestones…</p>
    </div>
  );

  // Treat certifications/placements as "pending review", others as completed
  const pending = milestones.filter((m) => m.kind === 'certification' || m.kind === 'placement' || m.kind === 'milestone');
  const completed = milestones.filter((m) => !pending.includes(m));

  if (milestones.length === 0) {
    return (
      <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }} aria-hidden="true">flag</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>No milestones yet</p>
        <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Milestones will appear here as your members progress through training.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 1.5rem' }}>
      {/* Pending Queue */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Pending Review</p>
          {pending.length > 0 && (
            <span style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', fontSize: '0.625rem', fontWeight: 700 }}>
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ background: 'var(--surface-container)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
            <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>No milestones pending review</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {pending.map((m) => (
              <div key={m.id} style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem', border: '1px solid #ebe7e7', borderLeft: '3px solid #8c0f37' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <Link href={`/partner/referred-members/${m.memberId}`} style={{ textDecoration: 'none' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}>{m.memberName}</p>
                    </Link>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-accent)', margin: '0 0 0.125rem' }}>{m.label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
                      {new Date(m.at).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    marginLeft: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(173,44,77,0.08)',
                    color: 'var(--color-accent)',
                  }}>
                    {m.kind}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Section */}
      {completed.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <button type="button"
            onClick={() => setCompletedOpen((o) => !o)}
            className="active:scale-[0.98] transition-all"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              background: 'none',
              border: 'none',
              borderTop: '1px solid #ebe7e7',
              cursor: 'pointer',
            }}
          >
            <p className="text-sm font-bold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>
              Completed ({completed.length})
            </p>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', transition: 'transform 0.2s', transform: completedOpen ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
              expand_more
            </span>
          </button>

          {completedOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem' }}>
              {completed.map((m) => (
                <div key={m.id} style={{ background: 'var(--surface-container-low)', borderRadius: '0.75rem', padding: '0.875rem 1rem', border: '1px solid #ebe7e7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}>{m.memberName}</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{m.label} · {new Date(m.at).toLocaleDateString()}</p>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: '#dcfce7',
                      color: '#166534',
                    }}>
                      Done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
