import { HTMLAttributes } from 'react';

type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
}

export function Badge({ tone = 'neutral', size = 'md', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'ui-badge',
        `ui-badge--${tone}`,
        `ui-badge--${size}`,
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
