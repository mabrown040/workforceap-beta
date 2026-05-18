'use client';

import { isRedirectError } from 'next/dist/client/components/redirect-error';
import RouteErrorFallback from '@/components/error/RouteErrorFallback';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (isRedirectError(error)) {
    throw error;
  }

  return <RouteErrorFallback error={error} reset={reset} context="admin" />;
}
