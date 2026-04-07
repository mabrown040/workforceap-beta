'use client';

import Link from 'next/link';

type LinkAction = { label: string; href: string };
type ButtonAction = { label: string; onClick: () => void };

type PortalEmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  primaryAction?: LinkAction | ButtonAction;
  secondaryAction?: LinkAction;
  className?: string;
};

function isButtonAction(a: LinkAction | ButtonAction): a is ButtonAction {
  return 'onClick' in a;
}

/**
 * Shared empty state for portal lists.
 */
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
        textAlign: 'center',
        padding: '2rem 1.25rem',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '2px dashed var(--outline-variant, #e5e5e5)',
        background: 'var(--surface-container-low, #fafafa)',
        maxWidth: '28rem',
        margin: '0 auto',
      }}
    >
      {icon ? <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>{icon}</div> : null}
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-on-surface, #1a1a1a)' }}>
        {title}
      </h3>
      {description ? (
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.9375rem', color: 'var(--color-on-surface-variant, #525252)', lineHeight: 1.5 }}>
          {description}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {primaryAction ? (
          isButtonAction(primaryAction) ? (
            <button type="button" className="btn btn-primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          ) : (
            <Link href={primaryAction.href} className="btn btn-primary">
              {primaryAction.label}
            </Link>
          )
        ) : null}
        {secondaryAction ? (
          <Link href={secondaryAction.href} className="btn btn-outline">
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
