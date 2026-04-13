import Link from 'next/link';

export default function EmployerApplicationsPager({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 0',
        flexWrap: 'wrap',
      }}
      aria-label="Applications pagination"
    >
      {page > 1 ? (
        <Link href={`/employer/applications?page=${page - 1}`} className="btn btn-outline btn-sm">
          Previous
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" style={{ opacity: 0.45, pointerEvents: 'none' }}>
          Previous
        </span>
      )}
      <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={`/employer/applications?page=${page + 1}`} className="btn btn-outline btn-sm">
          Next
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm" style={{ opacity: 0.45, pointerEvents: 'none' }}>
          Next
        </span>
      )}
    </nav>
  );
}
