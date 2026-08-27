import type { ReactNode } from 'react';

/** Serializable empty placeholder for listing and table shells. */
export function KitEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  /** Real next step — a kit CTA, never pep-talk. */
  action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'left', padding: 0 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0, color: 'var(--wa-text)' }}>
        {title}
      </h3>
      {description ? (
        <p className="wa-kit-lede" style={{ marginTop: 6 }}>
          {description}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}
