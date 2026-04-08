/**
 * Shared status badge pill used across all portals.
 *
 * Semantic variants map to every badge pattern in the app:
 *   success  → enrolled, placed, on track, live, healthy, hired
 *   warning  → needs focus, in review, pending review
 *   error    → at risk, not enrolled, rejected
 *   neutral  → draft, closed, default, unknown
 *   info     → in training, applied, interview, offered
 *   accent   → portal accent color (enrollment, pipeline default)
 */

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'accent';

const VARIANT_STYLES: Record<BadgeVariant, { background: string; color: string }> = {
  success: { background: '#dcfce7', color: '#166534' },
  warning: { background: '#fef3c7', color: '#92400e' },
  error:   { background: '#fee2e2', color: '#991b1b' },
  neutral: { background: '#f3f4f6', color: '#6b7280' },
  info:    { background: '#dbeafe', color: '#1e40af' },
  accent:  { background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' },
};

export default function StatusBadge({
  label,
  variant = 'neutral',
  className = '',
}: {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}) {
  const { background, color } = VARIANT_STYLES[variant];

  return (
    <span
      className={`portal-status-badge ${className}`.trim()}
      style={{ background, color }}
    >
      {label}
    </span>
  );
}
