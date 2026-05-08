import type { ReactNode } from 'react';

interface ProcessStepProps {
  step: string;
  icon?: string;
  title: ReactNode;
  description: ReactNode;
}

export function ProcessStep({ step, icon, title, description }: ProcessStepProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: 'var(--color-accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.25rem',
          flexShrink: 0,
        }}
      >
        {step}
      </div>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </div>
  );
}
