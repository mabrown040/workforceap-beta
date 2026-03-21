'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  hoverable?: boolean;
  padding?: 'none' | 'small' | 'default' | 'large';
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = 'default', 
    hoverable = false,
    padding = 'default',
    className = '', 
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'ui-card';
    const variantClasses = `ui-card-${variant}`;
    const hoverClasses = hoverable ? 'ui-card-hoverable' : '';
    const paddingClasses = `ui-card-padding-${padding}`;

    const combinedClasses = [
      baseClasses,
      variantClasses,
      hoverClasses,
      paddingClasses,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`ui-card-header ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`ui-card-body ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`ui-card-footer ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
