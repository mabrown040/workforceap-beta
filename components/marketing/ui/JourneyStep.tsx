import type { ReactNode } from 'react';

interface JourneyStepProps {
  number: string;
  icon: string;
  title: ReactNode;
  description: ReactNode;
}

export function JourneyStep({ number, icon, title, description }: JourneyStepProps) {
  return (
    <div style={{ position: 'relative', textAlign: 'left', padding: '2rem 1.5rem' }}>
      <div
        style={{
          fontSize: '5rem',
          fontWeight: 900,
          color: 'var(--color-on-surface)',
          opacity: 0.06,
          position: 'absolute',
          top: '0',
          left: '1rem',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        {number}
      </div>
      <div style={{ position: 'relative', zIndex: 1, paddingTop: '1.5rem' }}>
        <span
          className="material-symbols-outlined"
          style={{
            color: 'var(--color-accent)',
            fontSize: '1.75rem',
            marginBottom: '0.75rem',
            display: 'block',
            '--ms-fill': 1,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
          {title}
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
