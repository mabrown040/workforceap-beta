import type { ReactNode } from 'react';

export type QueueTone = 'red' | 'yellow' | 'blue';

interface QueueRowProps {
  tone: QueueTone;
  icon?: ReactNode;
  title: string;
  meta?: string;
  /** Short uppercase flag shown before the action (hidden on small screens). */
  flag?: string;
  action?: ReactNode;
  onClick?: () => void;
}

const TONE: Record<QueueTone, { c: string; bg: string }> = {
  // Follows lib/ui/statusColors.ts: status-severity color is the brand accent
  // app-wide (StatusBadge 'error', AtRiskDashboard CRITICAL, counselor triage
  // via statusColors 'danger'), while `--wa-danger` true red is reserved for
  // destructive ACTION affordances (e.g. ConfirmDialog's delete button).
  // This briefly pointed at --wa-danger, which made the counselor overview's
  // critical rows disagree with every other at-risk surface in the portal.
  red: { c: 'var(--color-accent)', bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' },
  yellow: { c: 'var(--wa-gold)', bg: 'var(--wa-gold-soft)' },
  blue: { c: 'var(--wa-info)', bg: 'var(--wa-info-soft)' },
};

/**
 * Triage / attention row. red = urgent today, yellow = watch, blue = celebrate.
 * Mockup: counselor triage, partner attention queue.
 */
export function QueueRow({ tone, icon, title, meta, flag, action, onClick }: QueueRowProps) {
  const t = TONE[tone];
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`wa-kit-card wa-kit-card--sm wa-kit-card--hover${onClick ? ' wa-kit-focus' : ''}`}
      style={{ background: t.bg, borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, cursor: onClick ? 'pointer' : undefined }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 12, background: t.c, color: 'var(--wa-on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        {meta ? <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{meta}</div> : null}
      </div>
      {flag ? (
        <span className="wa-hidden md:wa-inline" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: t.c }}>
          {flag}
        </span>
      ) : null}
      {action}
    </div>
  );
}
