import type { ReactNode } from 'react';

interface StatCardProps {
  value: ReactNode;
  label: ReactNode;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="portal-card portal-card--flat stat-card" style={{ padding: '1.5rem' }}>
      <div
        className="stat-card-value"
        style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          color: 'var(--color-accent)',
          lineHeight: 1,
          marginBottom: '0.75rem',
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
