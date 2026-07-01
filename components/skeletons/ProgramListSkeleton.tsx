'use client';

/**
 * Loading skeleton for program list cards.
 * Mirrors the program card layout with image, title, and badges.
 */
export function ProgramListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading programs"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
        gap: '1.5rem',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="portal-card portal-card--flat"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            className="portal-skeleton"
            style={{ height: '180px', width: '100%' }}
          />
          <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
            <div
              className="portal-skeleton"
              style={{
                height: '1.125rem',
                width: '70%',
                borderRadius: '0.375rem',
                marginBottom: '0.75rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div
                className="portal-skeleton"
                style={{
                  height: '1.25rem',
                  width: '4.5rem',
                  borderRadius: '999px',
                }}
              />
              <div
                className="portal-skeleton"
                style={{
                  height: '1.25rem',
                  width: '5rem',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
