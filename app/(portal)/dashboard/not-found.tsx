import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div style={{ padding: '2rem', maxWidth: '36rem', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Page not found</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        That dashboard page doesn&rsquo;t exist or may have moved. You&rsquo;re still signed in.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Home
        </Link>
        <Link href="/dashboard/messages" className="btn btn-ghost">
          Message Counselor
        </Link>
      </div>
    </div>
  );
}
