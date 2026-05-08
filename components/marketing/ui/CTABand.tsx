import type { ReactNode } from 'react';

interface CTABandProps {
  headline: ReactNode;
  subheadline?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}

export function CTABand({ headline, subheadline, primaryAction, secondaryAction }: CTABandProps) {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark, #8B1C3A) 100%)',
        padding: '4rem clamp(1rem, 4vw, 2rem)',
        textAlign: 'center',
      }}
    >
      <div className="container" style={{ maxWidth: 'var(--max-width, 80rem)', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: 'var(--color-white)',
            marginBottom: '1rem',
          }}
        >
          {headline}
        </h2>
        {subheadline && (
          <p
            style={{
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.85)',
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
