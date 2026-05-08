import type { ReactNode } from 'react';

interface ValueCardProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'elevated' | 'accent';
}

export function ValueCard({ icon, title, description, action, variant = 'default' }: ValueCardProps) {
  const bg = variant === 'accent' ? 'var(--color-accent)' : variant === 'elevated' ? 'var(--surface-container)' : 'var(--surface-container-low)';
  const textColor = variant === 'accent' ? 'var(--color-white)' : 'var(--color-on-surface)';
  const descColor = variant === 'accent' ? 'rgba(255,255,255,0.8)' : 'var(--color-on-surface-variant)';

  return (
    <div
      style={{
        background: bg,
        borderRadius: 'var(--radius-xl, 1rem)',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        color: textColor,
      }}
    >
      {icon && <div style={{ color: variant === 'accent' ? 'var(--color-gold)' : 'var(--color-accent)' }}>{icon}</div>}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: textColor }}>{title}</h3>
      {description && <p style={{ fontSize: '0.95rem', lineHeight: 1.6, margin: 0, color: descColor, flex: 1 }}>{description}</p>}
      {action && <div style={{ marginTop: 'auto' }}>{action}</div>}
    </div>
  );
}
