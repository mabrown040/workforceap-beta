import type { ReactNode } from 'react';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import type { KitTone } from './tokens';

interface StatusTagProps extends KitBaseProps<HTMLSpanElement>, KitDataAttrs {
  children: ReactNode;
  tone?: KitTone;
}

/**
 * Semantic status pill — kit-native `.wa-kit-tag--*` on `--wa-*`.
 * Colors map to DESIGN.md states (ok=green, warn=gold, alert=attention, etc.).
 */
export function StatusTag({ children, tone = 'muted', className, style, ref, ...rest }: StatusTagProps) {
  return (
    <span
      ref={ref}
      className={cx(`wa-kit-tag wa-kit-tag--${tone}`, className)}
      style={style}
      {...rest}
    >
      {children}
    </span>
  );
}
