import type { ReactNode } from 'react';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import type { KitTone } from './tokens';

interface StatusTagProps extends KitBaseProps<HTMLSpanElement>, KitDataAttrs {
  children: ReactNode;
  tone?: KitTone;
}

/**
 * Semantic pill. Colors map to DESIGN.md states via the .wa-kit-tag--* classes
 * (ok=green, warn=gold, alert=crimson, danger=red, info=blue, muted=gray).
 * Use `danger` (not `alert`) for destructive/failed/rejected states — see
 * the KitTone doc in ./tokens for why they're kept distinct.
 * Mockup: every table status column + risk tier.
 */
export function StatusTag({ children, tone = 'muted', className, style, ref, ...rest }: StatusTagProps) {
  return (
    <span ref={ref} className={cx(`wa-kit-tag wa-kit-tag--${tone}`, className)} style={style} {...rest}>
      {children}
    </span>
  );
}
