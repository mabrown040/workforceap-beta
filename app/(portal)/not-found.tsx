import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Page not found</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <Link href="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
        <Link href="/help" className="btn btn-ghost">
          Get Help
        </Link>
      </div>
    </div>
  );
}