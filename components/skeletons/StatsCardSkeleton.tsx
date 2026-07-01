'use client';

/**
 * Loading skeleton for dashboard stats cards.
 * Mirrors the metric card layout so the transition feels instant.
 */
export function StatsCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="portal-metric-strip"
      role="status"
      aria-live="polite"
      aria-label="Loading stats"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="portal-card portal-card--flat"
          style={{ padding: '1.25rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div
              className="portal-skeleton"
              style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem' }}
            />
            <div
              className="portal-skeleton"
              style={{ width: '1rem', height: '1rem', borderRadius: '0.25rem' }}
            />
          </div>
          <div
            className="portal-skeleton"
            style={{ height: '1.75rem', width: '3.5rem', borderRadius: '0.375rem', marginBottom: '0.35rem' }}
          />
          <div
            className="portal-skeleton"
            style={{ height: '0.75rem', width: '5rem', borderRadius: '999px' }}
          />
        </div>
      ))}
    </div>
  );
}
