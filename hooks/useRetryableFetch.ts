'use client';

import { useState, useCallback, useRef } from 'react';

type RetryState = {
  retryCount: number;
  isRetrying: boolean;
  nextRetryIn: number;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export function useRetryableFetch() {
  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    nextRetryIn: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRetryState({ retryCount: 0, isRetrying: false, nextRetryIn: 0 });
  }, []);

  const execute = useCallback(
    async <T extends any>(
      fetchFn: () => Promise<T>,
      onSuccess: (data: T) => void,
      onError: (error: string) => void,
      options?: { maxRetries?: number; retryableErrors?: string[] }
    ): Promise<void> => {
      const maxRetries = options?.maxRetries ?? MAX_RETRIES;
      const retryableErrors = options?.retryableErrors ?? [
        'rate limit',
        '429',
        'busy',
        'temporarily unavailable',
        '503',
        'timeout',
        'network',
        'fetch failed',
        'ECONNRESET',
      ];

      clearRetry();
      abortRef.current = new AbortController();

      const attempt = async (attemptNum: number): Promise<void> => {
        try {
          const data = await fetchFn();
          setRetryState({ retryCount: attemptNum - 1, isRetrying: false, nextRetryIn: 0 });
          onSuccess(data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const lower = message.toLowerCase();
          const neverRetry = [
            'not configured',
            'ai_unconfigured',
            'unauthorized',
            'validation',
          ];
          const isRetryable =
            !neverRetry.some((re) => lower.includes(re)) &&
            retryableErrors.some((re) => lower.includes(re.toLowerCase()));

          if (isRetryable && attemptNum < maxRetries) {
            const delay = BASE_DELAY_MS * Math.pow(2, attemptNum - 1);
            setRetryState({
              retryCount: attemptNum,
              isRetrying: true,
              nextRetryIn: delay,
            });

            timerRef.current = setTimeout(() => {
              attempt(attemptNum + 1);
            }, delay);
          } else {
            setRetryState({
              retryCount: attemptNum - 1,
              isRetrying: false,
              nextRetryIn: 0,
            });
            onError(message);
          }
        }
      };

      attempt(1);
    },
    [clearRetry]
  );

  return { execute, clearRetry, retryState };
}
