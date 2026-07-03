'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import {
  buttonClasses,
  type ButtonRadius,
  type ButtonVariant,
} from '@/lib/ui/buttonClasses';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `outline`/`tertiary` map onto secondary/ghost for backwards compatibility */
  variant?: ButtonVariant | 'dark' | 'muted' | 'outline' | 'tertiary';
  radius?: ButtonRadius;
  size?: 'small' | 'default' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  onDarkSecondary?: boolean;
  onDarkGhost?: boolean;
}

function legacyVariantClass(variant: NonNullable<ButtonProps['variant']>): string {
  if (variant === 'outline') return 'btn-secondary';
  if (variant === 'tertiary') return 'btn-ghost';
  return `btn-${variant}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      radius = 'md',
      size = 'default',
      fullWidth = false,
      loading = false,
      onDarkSecondary = false,
      onDarkGhost = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const modifiers = [
      size === 'small' ? 'btn-small' : '',
      size === 'large' ? 'btn-large' : '',
      fullWidth ? 'btn-full-width' : '',
      loading ? 'btn-loading' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const isCoreVariant =
      variant === 'primary' || variant === 'secondary' || variant === 'ghost';

    const combinedClasses = isCoreVariant
      ? buttonClasses({
          variant,
          radius,
          large: size === 'large',
          onDarkSecondary,
          onDarkGhost,
          className: modifiers,
        })
      : ['btn', legacyVariantClass(variant), radius !== 'md' ? `btn-radius-${radius}` : '', modifiers]
          .filter(Boolean)
          .join(' ');

    return (
      <button
        type="button"
        ref={ref}
        className={combinedClasses}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="btn-spinner" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="30 10"
                opacity="0.4"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 8 8"
                  to="360 8 8"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </span>
        )}
        {/* aria-live only while loading — an unconditional live region here would
            make screen readers announce every ordinary label change (e.g. toggle
            text, counters) as if it were a status update. */}
        <span
          className={loading ? 'btn-content-loading' : undefined}
          aria-live={loading ? 'polite' : undefined}
        >
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
