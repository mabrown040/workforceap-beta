'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

class VercelMetricsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[vercel-metrics] disabled after render error', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/** Keeps Vercel Analytics / Speed Insights from breaking the page if they throw. */
export default function SafeVercelMetrics() {
  return (
    <VercelMetricsErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </VercelMetricsErrorBoundary>
  );
}
