import type { ReactNode } from 'react';

/**
 * Serializable empty placeholder for server-rendered DataTable shells.
 *
 * A good empty state answers three questions: what this area is, why it is
 * empty, and what to do next. `title` + `description` cover the first two;
 * `action` carries the third (a link or button the parent renders). Staff
 * queues and rosters should always pass one — an empty admin table with no
 * next step is a dead end.
 */
export function KitEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  /** Single next-step affordance (link/button). Kept as a node so RSC parents can pass a <Link>. */
  action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', margin: 0, color: 'var(--wa-text)' }}>
        {title}
      </h3>
      {description ? (
        <p className="wa-kit-lede" style={{ marginTop: 6 }}>
          {description}
        </p>
      ) : null}
      {action ? (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>{action}</div>
      ) : null}
    </div>
  );
}
