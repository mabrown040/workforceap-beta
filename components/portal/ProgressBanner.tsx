'use client';

import Link from 'next/link';

type ProgressBannerProps = {
  programTitle: string;
  completedCount: number;
  totalCount: number;
};

export default function ProgressBanner({ programTitle, completedCount, totalCount }: ProgressBannerProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-light)',
        borderBottom: '1px solid var(--color-border, #e5e5e5)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {programTitle}
        </span>
        <div style={{ flex: 1, minWidth: '120px', maxWidth: '200px' }}>
          <div style={{ height: '6px', background: '#e5e5e5', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'var(--color-accent, #4a9b4f)',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
          {completedCount} of {totalCount} courses
        </span>
      </div>
      <Link href="/dashboard/training" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
        Continue Training →
      </Link>
    </div>
  );
}
