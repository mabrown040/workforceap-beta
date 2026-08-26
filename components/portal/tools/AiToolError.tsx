'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';

type AiToolErrorProps = {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  nextRetryIn?: number;
  retryCount?: number;
};

export default function AiToolError({
  error,
  onRetry,
  isRetrying,
  nextRetryIn,
  retryCount,
}: AiToolErrorProps) {
  const [countdown, setCountdown] = useState(nextRetryIn ?? 0);

  useEffect(() => {
    if (!isRetrying || !nextRetryIn || nextRetryIn <= 0) return;
    setCountdown(nextRetryIn);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return c - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRetrying, nextRetryIn]);

  const isRetryable = onRetry != null;
  const isRateLimited =
    error.toLowerCase().includes('rate limit') ||
    error.toLowerCase().includes('429') ||
    error.toLowerCase().includes('busy');
  const isUnavailable =
    error.toLowerCase().includes('unavailable') ||
    error.toLowerCase().includes('503');

  let friendlyMessage = error;
  if (error.toLowerCase().includes('not configured') || error.toLowerCase().includes('ai_unconfigured')) {
    friendlyMessage =
      'Career writing tools are not configured yet. Ask your counselor if you need help now.';
  } else if (isRateLimited) {
    friendlyMessage = isRetrying
      ? "Our AI tools are busy right now. We'll retry automatically."
      : 'Our AI tools are busy right now. Please try again in a minute.';
  } else if (isUnavailable) {
    friendlyMessage = isRetrying
      ? "This feature is temporarily unavailable. We'll retry automatically."
      : 'This feature is temporarily unavailable. Please try again in a minute.';
  } else if (error.toLowerCase().includes('no resume')) {
    friendlyMessage = error;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: 'rgba(173,44,77,0.08)',
        border: '1px solid rgba(173,44,77,0.2)',
        color: 'var(--color-accent)',
        fontSize: '0.875rem',
        lineHeight: 1.5}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isRetryable ? '0.75rem' : 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
          error
        </span>
        <p style={{ margin: 0, fontWeight: 600 }}>{friendlyMessage}</p>
      </div>

      {isRetryable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="btn btn-outline"
            style={{
              fontSize: '0.8125rem',
              padding: '0.4rem 0.875rem',
              opacity: isRetrying ? 0.6 : 1,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'}}
            aria-label={isRetrying ? 'Retrying automatically' : 'Retry now'}
          >
            {isRetrying ? (
              <>
                <PortalInlineSpinner size={14} />
                Retrying{retryCount != null ? ` (${retryCount + 1}/${3})` : ''}…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Retry now
              </>
            )}
          </button>

          {isRetrying && countdown > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              Next retry in {Math.ceil(countdown / 1000)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
