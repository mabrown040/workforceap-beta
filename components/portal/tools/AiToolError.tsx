'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
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
        borderRadius: 'var(--wa-radius-sm)',
        background: 'var(--wa-danger-soft)',
        border: '1px solid color-mix(in srgb, var(--wa-danger) 28%, var(--wa-border))',
        color: 'var(--wa-text)',
        fontSize: 14,
        lineHeight: 1.5}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isRetryable ? '0.75rem' : 0 }}>
        <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--wa-danger)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>{friendlyMessage}</p>
      </div>

      {isRetryable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            label={isRetrying ? `Retrying${retryCount != null ? ` (${retryCount + 1}/3)` : ''}…` : 'Retry now'}
            variant="secondary"
            size="sm"
            onClick={onRetry}
            isDisabled={isRetrying}
            style={{ minHeight: 44 }}
            icon={isRetrying ? <PortalInlineSpinner size={14} /> : <RefreshCw size={14} aria-hidden="true" />}
            aria-label={isRetrying ? 'Retrying automatically' : 'Retry now'}
          />

          {isRetrying && countdown > 0 && (
            <span style={{ fontSize: 13, color: 'var(--wa-muted)' }}>
              Next retry in {Math.ceil(countdown / 1000)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
