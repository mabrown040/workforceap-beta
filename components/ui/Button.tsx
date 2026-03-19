'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'outline';
  size?: 'small' | 'default' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'default', 
    fullWidth = false,
    loading = false,
    className = '', 
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'btn';
    const variantClasses = `btn-${variant}`;
    const sizeClasses = size === 'large' ? 'btn-large' : size === 'small' ? 'btn-small' : '';
    const widthClasses = fullWidth ? 'btn-full-width' : '';
    const loadingClasses = loading ? 'btn-loading' : '';

    const combinedClasses = [
      baseClasses,
      variantClasses,
      sizeClasses,
      widthClasses,
      loadingClasses,
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={combinedClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="btn-spinner" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="30 10" opacity="0.4">
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
        <span className={loading ? 'btn-content-loading' : undefined}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
