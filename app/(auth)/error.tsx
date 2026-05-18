'use client';

import { useEffect } from 'react';
import RouteErrorFallback from '@/components/error/RouteErrorFallback';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return <RouteErrorFallback error={error} reset={reset} context="auth" />;
}
