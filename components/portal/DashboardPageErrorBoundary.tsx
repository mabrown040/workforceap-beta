'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches client-side render errors in member workspace main content (all `/dashboard/*`
 * routes) without replacing the shell — `dashboard/error.tsx` handles errors that bubble
 * past this boundary (e.g. in WorkspaceShell chrome).
 */
export default class DashboardPageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DashboardPageErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="portal-error-fallback" style={{ padding: '2rem', maxWidth: '40rem', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>This section couldn&rsquo;t load</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            A part of the dashboard failed in your browser. Your sidebar and other pages should still work. Try again, or
            pick another area from the menu.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <Link href="/dashboard" className="btn btn-muted">
              Reload overview
            </Link>
            <Link href="/" className="btn btn-ghost">
              WorkforceAP home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
