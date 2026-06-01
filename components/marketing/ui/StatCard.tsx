import type { ReactNode } from 'react';

interface StatCardProps {
  value: ReactNode;
  label: ReactNode;
  /** Muted presentation for unpublished metrics (e.g. em dash placeholders). */
  unpublished?: boolean;
}

export function StatCard({ value, label, unpublished = false }: StatCardProps) {
  return (
    <div className="portal-card portal-card--flat stat-card" style={{ padding: '1.5rem' }}>
      <div
        className="stat-card-value"
        style={{
          fontSize: unpublished ? '2rem' : '2.5rem',
          fontWeight: unpublished ? 700 : 900,
          color: unpublished ? 'var(--color-on-surface-variant)' : 'var(--color-accent)',
          lineHeight: 1,
          marginBottom: '0.75rem',
          opacity: unpublished ? 0.75 : 1,
        }}
      >
        {value}
      </div>
      <p
        className="stat-card-label"
        style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}
      >
        {label}
      </p>
    </div>
  );
}
