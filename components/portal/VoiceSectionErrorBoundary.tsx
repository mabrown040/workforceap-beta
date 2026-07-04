'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { hasError: boolean };

/**
 * Keeps ElevenLabs / voice UI failures from unmounting the entire member dashboard
 * (which would surface app/(portal)/dashboard/error.tsx).
 */
export default class VoiceSectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VoiceSectionErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          className="portal-card portal-card--flat"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 12,
            marginBottom: '1rem',
            border: '1px solid var(--outline-variant, rgba(0,0,0,0.12))',
          }}
          role="status"
        >
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            Voice assistants could not load in this browser session. You can still use every other part of your
            dashboard — refresh the page if you&rsquo;d like to try voice coaching again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-sm"
          >
            Refresh page
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
