import type { ReactNode } from 'react';

interface InfoCardProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
}

export function InfoCard({ title, description, action, icon, variant = 'default' }: InfoCardProps) {
  const bg =
    variant === 'elevated'
      ? 'var(--surface-container-high)'
      : variant === 'bordered'
        ? 'var(--surface-container-low)'
        : 'var(--surface-container)';
  const border = variant === 'bordered' ? '1px solid var(--outline-variant)' : 'none';

  return (
    <div
      style={{
        background: bg,
        borderRadius: '0.875rem',
        border,
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        height: '100%',
      }}
    >
      {icon && <div style={{ color: 'var(--color-accent)' }}>{icon}</div>}
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{title}</h3>
      {description && (
        <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem', flex: 1 }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
