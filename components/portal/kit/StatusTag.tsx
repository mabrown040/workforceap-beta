'use client';

import type { ReactNode } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { cx, type KitBaseProps, type KitDataAttrs } from './base';
import { childrenToLabel, toneToBadgeVariant } from './astryxMap';
import type { KitTone } from './tokens';

interface StatusTagProps extends KitBaseProps<HTMLSpanElement>, KitDataAttrs {
  children: ReactNode;
  tone?: KitTone;
}

/**
 * Semantic status pill — Astryx `Badge` under the kit tone contract.
 * Colors map to DESIGN.md states (ok=green, warn=gold, alert=attention, etc.).
 */
export function StatusTag({ children, tone = 'muted', className, style, ref, ...rest }: StatusTagProps) {
  const label = childrenToLabel(children);
  if (!label) {
    return (
      <span ref={ref} className={cx(`wa-kit-tag wa-kit-tag--${tone}`, className)} style={style} {...rest}>
        {children}
      </span>
    );
  }

  return (
    <span ref={ref} className={className} style={style} {...rest}>
      <Badge label={label} variant={toneToBadgeVariant(tone)} />
    </span>
  );
}
