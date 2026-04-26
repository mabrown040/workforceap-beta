export default function EmployerLoading() {
  return (
    <div className="portal-route-loading" aria-busy="true" aria-label="Loading">
      {/* Hero Skeleton */}
      <div className="portal-skeleton portal-skeleton--hero" style={{ height: '120px' }} />
      
      {/* KPI Metric Strip Skeleton (4 cards) */}
      <div className="portal-skeleton-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem' }}>
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
      </div>

      {/* Main Content & Sidebar Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="portal-skeleton portal-skeleton--block" style={{ height: '400px' }} />
        <div className="portal-skeleton portal-skeleton--block" style={{ height: '400px' }} />
      </div>
    </div>
  );
}
