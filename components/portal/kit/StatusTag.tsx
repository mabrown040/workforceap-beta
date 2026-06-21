import type { ReactNode } from 'react';
import type { KitTone } from './tokens';

interface StatusTagProps {
  children: ReactNode;
  tone?: KitTone;
}

/**
 * Semantic pill. Colors map to DESIGN.md states via the .wa-kit-tag--* classes
 * (ok=green, warn=gold, alert=crimson, info=blue, muted=gray).
 * Mockup: every table status column + risk tier.
 */
export function StatusTag({ children, tone = 'muted' }: StatusTagProps) {
  return <span className={`wa-kit-tag wa-kit-tag--${tone}`}>{children}</span>;
}
