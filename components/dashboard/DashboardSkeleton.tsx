/**
 * DashboardSkeleton — perceived-performance loading layout for the member
 * dashboard home. Mirrors the mobile + desktop structure so the transition
 * from skeleton to real content feels instant (no layout shift).
 */
export default function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <p className="sr-only">Loading your dashboard</p>

      {/* Mobile hero skeleton */}
      <div className="md:wa-hidden" style={{ padding: '1.25rem 1.25rem 1rem' }}>
        <div
          style={{
            borderRadius: '1.5rem',
            padding: '1rem',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.9rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="portal-skeleton" style={{ height: '0.75rem', width: '5rem', borderRadius: '999px' }} />
              <div className="portal-skeleton" style={{ height: '1.625rem', width: '70%', borderRadius: '0.5rem' }} />
              <div className="portal-skeleton" style={{ height: '0.875rem', width: '50%', borderRadius: '0.5rem' }} />
            </div>
            <div className="portal-skeleton" style={{ width: '7.5rem', height: '5rem', borderRadius: '1rem', flexShrink: 0 }} />
          </div>
          <div className="portal-skeleton" style={{ height: '0.75rem', width: '90%', marginTop: '0.9rem', borderRadius: '0.5rem' }} />
        </div>
      </div>

      {/* Mobile state-A CTA skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem 1.25rem' }}>
        <div className="portal-skeleton" style={{ height: '10rem', borderRadius: '1rem' }} />
      </div>

      {/* Progress strip skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.5rem 1rem' }}>
        <div className="portal-skeleton" style={{ height: '2.5rem', borderRadius: '0.75rem' }} />
      </div>

      {/* Next-step card skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
        <div className="portal-skeleton" style={{ height: '8.5rem', borderRadius: '1rem' }} />
      </div>

      {/* Career path skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '0.5rem' }}>
        <div className="portal-skeleton" style={{ height: '4rem', borderRadius: '0.875rem' }} />
      </div>

      {/* Journey timeline skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '0.85rem' }}>
        <div className="portal-skeleton" style={{ height: '8rem', borderRadius: '0.875rem' }} />
      </div>

      {/* Points widget skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '1.25rem' }}>
        <div className="portal-skeleton" style={{ height: '7rem', borderRadius: '0.875rem' }} />
      </div>

      {/* Milestones carousel skeleton */}
      <div className="md:wa-hidden" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '0.75rem' }}>
          <div className="portal-skeleton" style={{ height: '0.75rem', width: '6rem', borderRadius: '999px' }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0 1.5rem' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="portal-skeleton"
              style={{
                width: 'min(240px, calc(100vw - 3rem))',
                minWidth: 'min(240px, calc(100vw - 3rem))',
                height: '10rem',
                borderRadius: '0.75rem',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick actions grid skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
        <div className="portal-skeleton" style={{ height: '0.75rem', width: '6rem', marginBottom: '0.75rem', borderRadius: '999px' }} />
        <div className="portal-skeleton-grid portal-skeleton-grid--dashboard-metrics">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
          ))}
        </div>
      </div>

      {/* Voice section skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem 1.25rem' }}>
        <div className="portal-skeleton" style={{ height: '3.5rem', borderRadius: '0.875rem' }} />
      </div>

      {/* Recent AI activity skeleton */}
      <div className="md:wa-hidden" style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
        <div className="portal-skeleton" style={{ height: '0.75rem', width: '7rem', marginBottom: '0.75rem', borderRadius: '999px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="portal-skeleton" style={{ height: '3.25rem', borderRadius: '0.625rem' }} />
          ))}
        </div>
      </div>

      {/* Desktop view skeleton */}
      <div className="wa-hidden md:wa-block">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem' }}>
          <div className="portal-skeleton-stack">
            <div className="portal-skeleton portal-skeleton--line portal-skeleton--lg" />
            <div className="portal-skeleton portal-skeleton--line portal-skeleton--md" />
          </div>
          <div className="portal-skeleton portal-skeleton--hero" />
          <div className="portal-skeleton-grid portal-skeleton-grid--dashboard-metrics">
            {[0, 1, 2].map((i) => (
              <div key={i} className="portal-skeleton portal-skeleton--card portal-skeleton--dashboard-metric" />
            ))}
          </div>
          <div className="portal-skeleton portal-skeleton--block portal-skeleton--dashboard-list" />
          <div className="portal-skeleton portal-skeleton--block portal-skeleton--short" />
        </div>
      </div>
    </div>
  );
}
