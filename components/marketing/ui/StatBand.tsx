import type { ReactNode } from 'react';

interface StatItemProps {
  value: ReactNode;
  label: ReactNode;
}

interface StatBandProps {
  stats: StatItemProps[];
  variant?: 'default' | 'dark' | 'accent';
}

export function StatBand({ stats, variant = 'default' }: StatBandProps) {
  const bg = variant === 'accent' ? 'var(--color-accent)' : variant === 'dark' ? 'var(--surface-container)' : 'transparent';
  const valueColor = variant === 'accent' ? 'var(--color-white)' : 'var(--color-on-surface)';
  const labelColor = variant === 'accent' ? 'rgba(255,255,255,0.8)' : 'var(--color-on-surface-variant)';
  const border = variant === 'default' ? '1px solid var(--outline-variant)' : 'none';

  return (
    <div
      style={{
        background: bg,
        borderRadius: 'var(--radius-xl, 1rem)',
        border,
        padding: '2rem clamp(1rem, 3vw, 2.5rem)',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`,
        gap: '2rem',
        textAlign: 'center',
      }}
    >
      {stats.map((stat, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1, color: valueColor }}>
            {stat.value}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: labelColor }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
