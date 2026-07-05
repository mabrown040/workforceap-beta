'use client';

import { Spinner } from '@astryxdesign/core/Spinner';

export default function PortalLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="portal-loading-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        minHeight: '240px',
      }}
    >
      <Spinner size="lg" label={message} />
    </div>
  );
}
