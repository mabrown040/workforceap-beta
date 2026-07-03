/**
 * Portal Design Kit — token helpers (Phase 0).
 * Maps semantic color names to the CSS custom properties in css/portal-tokens.css
 * so components take `color="accent"` instead of hardcoding hex.
 */
export type KitColor = 'accent' | 'accentDark' | 'gold' | 'info' | 'success' | 'text' | 'muted';

const COLOR_VARS: Record<KitColor, string> = {
  accent: 'var(--wa-accent)',
  accentDark: 'var(--wa-accent-dark)',
  gold: 'var(--wa-gold)',
  info: 'var(--wa-info)',
  success: 'var(--wa-success)',
  text: 'var(--wa-text)',
  muted: 'var(--wa-muted)',
};

export function colorVar(c: KitColor | undefined, fallback: KitColor = 'text'): string {
  return COLOR_VARS[c ?? fallback];
}

/**
 * `alert` = brand-magenta attention (`--wa-accent`) for "needs a look" states.
 * `danger` = true red (`--wa-danger`) for destructive/error/failed states.
 * They're deliberately distinct so a rejected/failed row doesn't read as just
 * another brand-colored highlight — reach for `danger` there instead of `alert`.
 */
export type KitTone = 'ok' | 'warn' | 'alert' | 'danger' | 'info' | 'muted';
