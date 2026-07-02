'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DataTable from '@/components/portal/ui/DataTable';

export type JobTableRow = {
  id: string;
  title: string;
  status: string;
  employer: { companyName: string | null } | null;
  _count: { applications: number } | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  live: 'Live',
  filled: 'Filled',
  closed: 'Closed',
};

function getJobStatusPillClass(status: string): string {
  if (status === 'live') return 'admin-job-status-pill admin-job-status-pill--live';
  if (status === 'pending') return 'admin-job-status-pill admin-job-status-pill--pending';
  return 'admin-job-status-pill';
}

type SortKey = 'job' | 'company' | 'status' | 'apps';
type SortDir = 'asc' | 'desc';

// Ascending status sort follows the review workflow: draft → pending → approved → live → filled → closed.
const STATUS_RANK: Record<string, number> = { draft: 0, pending: 1, approved: 2, live: 3, filled: 4, closed: 5 };

function compareJobs(a: JobTableRow, b: JobTableRow, key: SortKey): number {
  switch (key) {
    case 'job':
      return a.title.localeCompare(b.title);
    case 'company':
      return (a.employer?.companyName ?? '').localeCompare(b.employer?.companyName ?? '');
    case 'status':
      return (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
    case 'apps':
      return (a._count?.applications ?? 0) - (b._count?.applications ?? 0);
    default:
      return 0;
  }
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        fontWeight: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
      }}
      aria-label={`Sort by ${label}${active ? (dir === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      {label}
      <span style={{ fontSize: '0.7em', opacity: active ? 1 : 0.3 }}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </button>
  );
}

export default function JobsTableClient({
  jobs,
  totalCount,
  currentPage,
  pageSize,
}: {
  jobs: JobTableRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // null = keep the server's updatedAt-desc order until a column is clicked.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const totalPages = Math.ceil(totalCount / pageSize);

  // Preserve existing query params (e.g. ?ui=legacy&filter=...) when changing pages.
  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const sorted = useMemo(() => {
    if (!sortKey) return jobs;
    const dir = sortDir === 'asc' ? 1 : -1;
    // Stable sort with an index tiebreaker so equal keys keep the server order.
    return jobs
      .map((j, i) => [j, i] as const)
      .sort(([a, ia], [b, ib]) => {
        const primary = compareJobs(a, b, sortKey) * dir;
        return primary !== 0 ? primary : ia - ib;
      })
      .map(([j]) => j);
  }, [jobs, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Text columns default ascending (A→Z); Applications defaults to highest first.
      setSortDir(key === 'apps' ? 'desc' : 'asc');
    }
  }

  const header = (label: string, key: SortKey) => (
    <SortHeader label={label} sortKey={key} active={sortKey === key} dir={sortDir} onSort={onSort} />
  );

  return (
    <>
      {/* Desktop-only table; the server page renders mobile cards from the same rows. */}
      <div className="wa-hidden md:wa-block" style={{ overflowX: 'auto' }}>
        <DataTable
          variant="admin"
          tableClassName="admin-table admin-jobs-table"
          scrollX={false}
          rows={sorted}
          rowKey={(j) => j.id}
          columns={[
            {
              key: 'job',
              header: header('Job', 'job'),
              cell: (j) => (
                <Link href={`/admin/jobs/${j.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                  {j.title}
                </Link>
              ),
            },
            {
              key: 'company',
              header: header('Company', 'company'),
              columnClassName: 'admin-jobs-col-company',
              cell: (j) => j.employer?.companyName ?? 'Unknown',
            },
            {
              key: 'status',
              header: header('Status', 'status'),
              cell: (j) => (
                <span className={getJobStatusPillClass(j.status)}>{STATUS_LABELS[j.status] ?? j.status}</span>
              ),
            },
            {
              key: 'apps',
              header: header('Applications', 'apps'),
              columnClassName: 'admin-jobs-col-apps',
              cell: (j) => j._count?.applications ?? 0,
            },
            {
              key: 'actions',
              header: 'Actions',
              columnClassName: 'admin-jobs-col-actions',
              cell: (j) => (
                <>
                  <Link href={`/admin/jobs/${j.id}`} style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}>
                    Review
                  </Link>
                  <Link href={`/admin/jobs/${j.id}#matches`} style={{ fontSize: '0.9rem' }}>
                    AI Matches
                  </Link>
                </>
              ),
            },
          ]}
        />
      </div>

      {/* Pagination — outside the desktop-only wrapper so it also pages the mobile cards. */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
            .map((page, i, pages) => (
              <Fragment key={page}>
                {i > 0 && page - pages[i - 1] > 1 ? <span aria-hidden="true" style={{ alignSelf: 'center', color: 'var(--color-on-surface-variant)' }}>…</span> : null}
                <button
                  type="button"
                  className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => goToPage(page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              </Fragment>
            ))}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
