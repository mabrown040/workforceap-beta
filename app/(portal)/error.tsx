'use client';

import RouteErrorFallback from '@/components/error/RouteErrorFallback';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} context="portal" />;
}
