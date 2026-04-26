import Link from 'next/link';
import type { ReactNode } from 'react';

export type PortalEmptyStateProps = {
  title: string;
  description: string;
  icon: ReactNode;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  className?: string;
};

export default function PortalEmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className = '',
}: PortalEmptyStateProps) {
  return (
    <div
      className={`portal-empty-state ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: 'var(--surface-container-low)',
        border: '1px dashed var(--outline-variant)',
        borderRadius: '1rem',
      }}
    >
      <div
        style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: 'var(--surface-container-high)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'var(--color-on-surface-variant)',
          marginBottom: '1.25rem',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--color-on-surface)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: '0 0 1.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-on-surface-variant)',
          maxWidth: '24rem',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="btn btn-secondary"
            >
              {secondaryAction.label}
            </Link>
          )}
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className="btn btn-primary"
            >
              {primaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
