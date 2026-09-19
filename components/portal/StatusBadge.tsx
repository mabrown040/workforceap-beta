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
  success: { background: 'color-mix(in srgb, var(--color-green) 15%, transparent)', color: 'var(--color-green)' },
  // Gold text on a gold tint fails AA in both modes (3.0:1 light / 3.9:1 dark on
  // --wa-surface). --wa-gold-dark is the token layer's text-on-gold-tint colour and
  // --wa-gold-soft its tint — the same pair the kit's .wa-kit-tag--warn uses.
  warning: { background: 'var(--wa-gold-soft)', color: 'var(--wa-gold-dark)' },
  error:   { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' },
  neutral: { background: 'var(--surface-container-high)', color: 'var(--color-on-surface-variant)' },
  info:    { background: 'color-mix(in srgb, var(--color-blue) 15%, transparent)', color: 'var(--color-blue)' },
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
