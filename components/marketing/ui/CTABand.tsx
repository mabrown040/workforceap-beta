import type { ReactNode } from 'react';

interface CTABandProps {
  headline: ReactNode;
  subheadline?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: 'dark' | 'light' | 'gradient';
}

export function CTABand({ headline, subheadline, primaryAction, secondaryAction, variant = 'dark' }: CTABandProps) {
  const isDark = variant === 'dark' || variant === 'gradient';
  const bg = variant === 'gradient'
    ? 'linear-gradient(to right, var(--color-accent), var(--color-accent-dark))'
    : isDark
      ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark, #8B1C3A) 100%)'
      : 'transparent';
  const headlineColor = isDark ? 'var(--color-white)' : 'var(--color-on-surface)';
  const subColor = isDark ? 'rgba(255,255,255,0.85)' : 'var(--color-on-surface-variant)';
  const padding = isDark ? '4rem clamp(1rem, 4vw, 2rem)' : 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)';

  return (
    <section
      style={{
        background: bg,
        padding,
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: headlineColor,
            marginBottom: '1rem',
          }}
        >
          {headline}
        </h2>
        {subheadline && (
          <p
            style={{
              fontSize: '1.05rem',
              color: subColor,
              maxWidth: '40rem',
              margin: '0 auto 2rem',
              lineHeight: 1.6,
            }}
          >
            {subheadline}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    </section>
  );
}
