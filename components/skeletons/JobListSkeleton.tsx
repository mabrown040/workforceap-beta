'use client';

/**
 * Loading skeleton for job listing cards.
 * Mirrors the job card layout with company info, title, and meta.
 */
export function JobListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading jobs"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="portal-card portal-card--flat"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
          }}
        >
          <div
            className="portal-skeleton"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="portal-skeleton"
              style={{
                height: '0.875rem',
                width: '60%',
                borderRadius: '0.375rem',
                marginBottom: '0.4rem',
              }}
            />
            <div
              className="portal-skeleton"
              style={{
                height: '0.75rem',
                width: '40%',
                borderRadius: '0.375rem',
              }}
            />
          </div>
          <div
            className="portal-skeleton"
            style={{
              width: '3.5rem',
              height: '1.5rem',
              borderRadius: '0.375rem',
              flexShrink: 0,
            }}
          />
        </div>
      ))}
    </div>
  );
}
