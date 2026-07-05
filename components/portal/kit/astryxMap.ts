import type { ReactNode } from 'react';
import type { KitTone } from './tokens';

/** Map kit status tones → Astryx Badge variants. */
export function toneToBadgeVariant(tone: KitTone): 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pink' | 'yellow' | 'blue' | 'red' {
  switch (tone) {
    case 'ok':
      return 'success';
    case 'warn':
      return 'warning';
    case 'alert':
      /* Astryx `info` badge uses --color-accent (WAP crimson), not blue. */
      return 'info';
    case 'danger':
      return 'error';
    case 'info':
      return 'blue';
    case 'muted':
    default:
      return 'neutral';
  }
}

/** Map kit status tones → Astryx Token colors (lighter categorization chips). */
export function toneToTokenColor(tone: KitTone): 'green' | 'yellow' | 'pink' | 'red' | 'blue' | 'gray' | 'default' {
  switch (tone) {
    case 'ok':
      return 'green';
    case 'warn':
      return 'yellow';
    case 'alert':
      return 'red';
    case 'danger':
      return 'red';
    case 'info':
      return 'blue';
    case 'muted':
    default:
      return 'gray';
  }
}

/** Flatten ReactNode children to a Token/Badge label string. */
export function childrenToLabel(children: ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToLabel).join('');
  return '';
}

/** Map pixel avatar sizes from kit callers → Astryx named sizes. */
export function pixelAvatarSize(size: number): 'xsmall' | 'small' | 'medium' | 'large' {
  if (size >= 56) return 'large';
  if (size >= 40) return 'medium';
  if (size >= 32) return 'small';
  return 'xsmall';
}
