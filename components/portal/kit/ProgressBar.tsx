'use client';

import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';

interface ProgressBarProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  /** 0–100. */
  pct: number;
  color?: import('./tokens').KitColor;
  'aria-label'?: string;
}

/** Kit progress track — Astryx `ProgressBar` (brand tokens via global CSS bridge). */
export function ProgressBar({ pct, 'aria-label': ariaLabel, className, style, ref, ...rest }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div ref={ref} className={cx(className)} style={style} {...rest}>
      <AstryxProgressBar value={clamped} label={ariaLabel ?? 'Progress'} />
    </div>
  );
}
