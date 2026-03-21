'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '480px' }}>
        We hit an unexpected error. Please try again, or contact us at info@workforceap.org if the problem continues.
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
