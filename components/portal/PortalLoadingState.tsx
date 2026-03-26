export default function PortalLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="portal-loading-state" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      minHeight: '240px'
    }}>
      <div className="loading-spinner" style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--color-gray-200)',
        borderTop: '3px solid var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '1rem'
      }} />
      <p style={{ color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
        {message}
      </p>
    </div>
  );
}
