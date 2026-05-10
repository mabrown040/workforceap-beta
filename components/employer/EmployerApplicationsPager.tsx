import Link from 'next/link';
import type { JobPostingApplicationStatus } from '@prisma/client';
import { employerApplicationsListHref, type EmployerApplicationsSort } from '@/lib/employer/employerApplicationsListQuery';

export default function EmployerApplicationsPager({
  page,
  totalPages,
  status,
  sort,
}: {
  page: number;
  totalPages: number;
  status?: JobPostingApplicationStatus | null;
  sort?: EmployerApplicationsSort;
}) {
  if (totalPages <= 1) return null;
  const sortVal = sort ?? 'applied_desc';
  const prevHref = employerApplicationsListHref({
    page: page - 1,
    status: status ?? undefined,
    sort: sortVal,
  });
  const nextHref = employerApplicationsListHref({
    page: page + 1,
    status: status ?? undefined,
    sort: sortVal,
  });
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
        <Link href={prevHref} className="btn btn-outline btn-sm">
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
        <Link href={nextHref} className="btn btn-outline btn-sm">
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
