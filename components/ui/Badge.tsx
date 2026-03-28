import { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'gold' | 'accent';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'default';
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
  gold: 'badge-gold',
  accent: 'badge-accent',
};

export function Badge({ variant = 'neutral', size = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'badge',
        variantClasses[variant],
        size === 'sm' ? 'badge-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
