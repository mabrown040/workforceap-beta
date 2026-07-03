/**
 * Single source of truth for semantic status colors — badges, chips, and
 * severity indicators across admin + portal surfaces.
 *
 * Every entry is a `{ fg, bg, border }` triple of `var()` strings built from
 * the existing brand tokens (`--color-green` / `--color-gold` / `--color-blue`
 * / `--color-accent`) plus `color-mix()` tints, so nothing here hardcodes a
 * hex value that could drift from the rest of the design kit.
 *
 * `danger` intentionally resolves to `--color-accent` (brand magenta), NOT
 * `--wa-danger` (true red). This mirrors two components that already ship
 * this exact palette app-wide:
 *   - components/portal/StatusBadge.tsx — variant `'error'` ("at risk, not
 *     enrolled, rejected") already uses `--color-accent`.
 *   - components/portal/counselor/AtRiskDashboard.tsx — `RISK_CONFIG`
 *     (lines ~84-87) colors CRITICAL/HIGH/MEDIUM with accent/gold/blue.
 * Backing `danger` with `--wa-danger` here would create a SECOND, disagreeing
 * status-color source — the opposite of this file's purpose. `--wa-danger`
 * is reserved for destructive ACTION affordances (e.g. ConfirmDialog's
 * confirm button) — a narrower, more severe class than an "at risk / error"
 * status chip, and deliberately kept visually distinct from it.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type StatusColorSet = {
  /** Icon / text color. */
  fg: string;
  /** Tinted background for a pill/chip. */
  bg: string;
  /** Tinted border for a pill/chip. */
  border: string;
};

export const STATUS_COLORS: Record<StatusTone, StatusColorSet> = {
  success: {
    fg: 'var(--color-green)',
    bg: 'color-mix(in srgb, var(--color-green) 15%, transparent)',
    border: 'color-mix(in srgb, var(--color-green) 35%, transparent)',
  },
  warning: {
    fg: 'var(--color-gold)',
    bg: 'color-mix(in srgb, var(--color-gold) 18%, transparent)',
    border: 'color-mix(in srgb, var(--color-gold) 40%, transparent)',
  },
  // See file header: matches StatusBadge's 'error' variant + AtRiskDashboard's
  // CRITICAL, both `--color-accent` — not `--wa-danger`.
  danger: {
    fg: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
    border: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
  },
  info: {
    fg: 'var(--color-blue)',
    bg: 'color-mix(in srgb, var(--color-blue) 15%, transparent)',
    border: 'color-mix(in srgb, var(--color-blue) 35%, transparent)',
  },
  neutral: {
    fg: 'var(--color-on-surface-variant)',
    bg: 'var(--surface-container-high)',
    border: 'var(--outline-variant)',
  },
};

/** Look up a semantic status color set. Prefer this over reaching into `STATUS_COLORS` directly. */
export function statusColor(tone: StatusTone): StatusColorSet {
  return STATUS_COLORS[tone];
}
