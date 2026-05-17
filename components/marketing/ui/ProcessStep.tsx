import type { ReactNode } from 'react';
import { marketingNumPillClasses } from '@/lib/marketing/buttonClasses';

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
        className={`${marketingNumPillClasses()} marketing-process-step__badge${centered ? ' marketing-process-step__badge--centered' : ' marketing-process-step__badge--left'}`}
      >
        {step}
      </div>
      {icon && (
        <span
          className="material-symbols-outlined marketing-process-step__icon"
          style={{
            fontSize: '2rem',
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
