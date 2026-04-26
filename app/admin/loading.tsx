export default function AdminLoading() {
  return (
    <div style={{ padding: '2rem' }} aria-busy="true" aria-label="Loading">
      <div className="portal-skeleton portal-skeleton--short" style={{ width: '250px', marginBottom: '2rem', height: '2rem' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
        <div className="portal-skeleton portal-skeleton--card" style={{ height: '140px' }} />
      </div>

      <div className="portal-skeleton portal-skeleton--block" style={{ height: '350px', marginBottom: '2rem' }} />
      <div className="portal-skeleton portal-skeleton--block" style={{ height: '350px' }} />
    </div>
  );
}
