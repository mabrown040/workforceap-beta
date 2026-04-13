'use client';

import { useEffect } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';

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

  useEffect(() => {
    console.error('[admin/error]', error.message, error.digest ?? '');
  }, [error]);

  return (
    <PortalRouteFallback
      title="Admin — something went wrong"
      description={
        error.digest
          ? `Try again, or contact your technical lead with reference ${error.digest}.`
          : 'Try again, or contact your technical lead if this continues.'
      }
    >
      <div className="portal-route-fallback__actions">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </PortalRouteFallback>
  );
}
