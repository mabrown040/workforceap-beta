'use client';

import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';
import { type KitBaseProps, type KitDataAttrs } from './base';
import { pixelAvatarSize } from './astryxMap';

interface AvatarProps extends KitBaseProps<HTMLDivElement>, KitDataAttrs {
  initials: string;
  size?: number;
  /** Gradient background (crimson) vs flat info-blue — kept for API compat; Astryx uses name initials. */
  gradient?: boolean;
}

/** Initials avatar — Astryx `Avatar` (circular, accessible name). */
export function Avatar({ initials, size = 36, className, style, ref, ...rest }: AvatarProps) {
  return (
    <span ref={ref} className={className} style={style} {...rest}>
      <AstryxAvatar name={initials} size={pixelAvatarSize(size)} />
    </span>
  );
}
