import Link from 'next/link';

/**
 * Shown when an admin Server Component fails to load data (DB timeout, etc.).
 */
export default function AdminDataLoadError({
  title = 'Could not load this page',
  message = 'There was a problem loading data. This is often temporary — try again in a moment.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      data-portal-error-state="admin-data-load"
      style={{ padding: '2rem 1.5rem', maxWidth: '32rem' }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--color-on-surface)' }}>{title}</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/admin" className="btn btn-primary btn-sm">
          Admin home
        </Link>
        <Link href="/admin/jobs" className="btn btn-outline btn-sm">
          Jobs
        </Link>
      </div>
    </div>
  );
}
