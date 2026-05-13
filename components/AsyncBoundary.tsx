'use client';

import { Suspense, type ReactNode } from 'react';
import ErrorBoundary from '@/components/error/ErrorBoundary';

interface AsyncBoundaryProps {
  children: ReactNode;
  /** Loading skeleton or placeholder */
  fallback?: ReactNode;
  /** Error fallback UI — if omitted, ErrorBoundary default is used */
  errorFallback?: ReactNode;
  onReset?: () => void;
}

/**
 * AsyncBoundary — combines ErrorBoundary + Suspense in one wrapper.
 *
 * Usage:
 *   <AsyncBoundary fallback={<StatsCardSkeleton />}>
 *     <SomeAsyncComponent />
 *   </AsyncBoundary>
 */
export default function AsyncBoundary({
  children,
  fallback,
  errorFallback,
  onReset,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback} onReset={onReset}>
      <Suspense fallback={fallback ?? <DefaultAsyncFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function DefaultAsyncFallback() {
  return (
    <div
      className="portal-card portal-card--flat"
      style={{
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
      }}
      aria-busy="true"
    >
      <p className="sr-only">Loading content</p>
      <div
        className="portal-skeleton"
        style={{
          height: '1rem',
          width: '60%',
          margin: '0 auto 0.75rem',
          borderRadius: '0.5rem',
        }}
      />
      <div
        className="portal-skeleton"
        style={{
          height: '1rem',
          width: '40%',
          margin: '0 auto',
          borderRadius: '0.5rem',
        }}
      />
    </div>
  );
}
