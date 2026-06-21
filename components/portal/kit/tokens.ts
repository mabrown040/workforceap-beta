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

export type KitTone = 'ok' | 'warn' | 'alert' | 'info' | 'muted';
