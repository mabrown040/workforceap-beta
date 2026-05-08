import type { ReactNode } from 'react';

interface ProcessStepProps {
  step: string;
  icon?: string;
  title: ReactNode;
  description: ReactNode;
  centered?: boolean;
}

export function ProcessStep({ step, icon, title, description, centered = false }: ProcessStepProps) {
  return (
    <div style={{ textAlign: centered ? 'center' : 'left', padding: '0 1rem', position: 'relative', zIndex: 1 }}>
      <div
        style={{
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          background: 'var(--color-accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: '1.25rem',
          margin: centered ? '0 auto 1.5rem' : '0 0 0.75rem',
          boxShadow: 'var(--shadow-glow-accent)',
          border: '3px solid var(--surface-container-low)',
        }}
      >
        {step}
      </div>
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '2rem',
            color: 'var(--color-accent)',
            marginBottom: '0.75rem',
            display: 'block',
            '--ms-fill': 1,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}
