'use client';

import { useEffect } from 'react';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';

export default function PortalError({
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

  return (
    <PortalRouteFallback
      title="Something went wrong"
      description={
        error.digest
          ? `This page hit an unexpected error. You can try again, or contact info@workforceap.org with reference ${error.digest}.`
          : 'This page hit an unexpected error. You can try again, or contact info@workforceap.org if it keeps happening.'
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
