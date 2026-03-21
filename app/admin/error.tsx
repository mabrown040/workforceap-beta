'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Admin Error</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '480px' }}>
        Something went wrong loading this page. Please try again or contact the development team.
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
        style={{ padding: '.75rem 2rem' }}
      >
        Try again
      </button>
    </div>
  );
}
