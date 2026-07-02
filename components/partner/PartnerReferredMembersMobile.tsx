'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import StatusBadge from '@/components/portal/StatusBadge';

export type PartnerMemberRow = {
  id: string;
  fullName: string | null;
  stage: string;
  stageLabel: string;
  progress: number;
  programTitle: string;
  story: string;
  referredAtLabel: string;
  /** Same field the partner payout flow gates on; null when there's no placement yet. */
  placementVerified?: boolean | null;
};

type Filter = 'all' | 'active' | 'placed' | 'atRisk';

export default function PartnerReferredMembersMobile({ rows }: { rows: PartnerMemberRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.stage !== 'placed' && r.stage !== 'closed').length,
      placed: rows.filter((r) => r.stage === 'placed').length,
      atRisk: rows.filter((r) => r.progress < 30 && r.stage === 'in_training').length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'active') return rows.filter((r) => r.stage !== 'placed' && r.stage !== 'closed');
    if (filter === 'placed') return rows.filter((r) => r.stage === 'placed');
    if (filter === 'atRisk') return rows.filter((r) => r.progress < 30 && r.stage === 'in_training');
    return rows;
  }, [rows, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'placed', label: 'Placed', count: counts.placed },
    { key: 'atRisk', label: 'At Risk', count: counts.atRisk },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 1rem', overflowX: 'auto' }}>
        {chips.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              style={{
                flexShrink: 0,
                padding: '0.375rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: active ? 'var(--color-accent)' : '#fff',
                color: active ? '#fff' : 'var(--color-on-surface-variant)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--outline-variant)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {chip.label}
              {chip.count > 0 ? (
                <span style={{ marginLeft: '0.375rem', fontSize: '0.75rem', opacity: 0.85 }}>{chip.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }} aria-hidden="true">
              group
            </span>
            <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
              No members yet
            </p>
            <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
              You haven't referred any members yet. Tap Invite Member above to start building your pipeline.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="wa-text-sm" style={{ color: 'var(--color-on-surface-variant)', textAlign: 'center', padding: '1.5rem' }}>
            No members match this filter. Try a different filter option.
          </p>
        ) : (
          filtered.map((row) => {
            const initials = (row.fullName ?? '?')
              .split(' ')
              .map((name: string) => name[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const isPlaced = row.stage === 'placed';
            const isAtRisk = row.progress < 30 && row.stage === 'in_training';
            const badgeBg = isPlaced ? '#dcfce7' : isAtRisk ? '#fef3c7' : 'rgba(173,44,77,0.08)';
            const badgeColor = isPlaced ? '#166534' : isAtRisk ? 'var(--color-gold)' : 'var(--color-accent)';

            return (
              <Link key={row.id} href={`/partner/referred-members/${row.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '0.75rem',
                    padding: '0.875rem 1rem',
                    border: '1px solid #ebe7e7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '9999px',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      className="wa-text-sm wa-font-semibold"
                      style={{
                        color: 'var(--color-on-surface)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.fullName}
                    </p>
                    <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
                      {row.programTitle} · Enrolled {row.referredAtLabel}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: badgeBg,
                        color: badgeColor,
                      }}
                    >
                      {row.stageLabel}
                    </span>
                    {isPlaced && (
                      <StatusBadge
                        label={row.placementVerified ? 'Verified' : 'Pending verification'}
                        variant={row.placementVerified ? 'success' : 'warning'}
                      />
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
