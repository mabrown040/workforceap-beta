import type { ReactNode } from 'react';

interface WorkQueueItemProps {
  icon?: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
  /** Crimson-tinted urgent treatment. */
  urgent?: boolean;
}

/**
 * "What needs you today" row for admin/employer command surfaces.
 * Mockup: admin command center work queue, employer work queue.
 */
export function WorkQueueItem({ icon, title, detail, action, urgent = false }: WorkQueueItemProps) {
  return (
    <div
      className="wa-kit-card wa-kit-card--sm"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: urgent ? 'var(--wa-accent-soft)' : 'var(--wa-surface)',
        borderColor: urgent ? 'transparent' : 'var(--wa-border)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--wa-on-accent)',
          background: urgent ? 'var(--wa-accent)' : 'var(--wa-info)',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        {detail ? <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{detail}</div> : null}
      </div>
      {action}
    </div>
  );
}
