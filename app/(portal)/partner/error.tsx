'use client';

import RouteErrorFallback from '@/components/error/RouteErrorFallback';

export default function PartnerPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} context="partner" />;
}
