'use client';

import { useRouter } from 'next/navigation';
import type { JobPostingApplicationStatus } from '@prisma/client';
import { Pagination } from '@astryxdesign/core/Pagination';
import { employerApplicationsListHref, type EmployerApplicationsSort } from '@/lib/employer/employerApplicationsListQuery';

/**
 * Applications pager — Astryx `Pagination` (numbered pages + prev/next) over
 * the same URL-state contract as before: page changes push the canonical
 * `employerApplicationsListHref` so the list stays server-rendered and
 * back/forward keep working.
 */
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
  const router = useRouter();
  if (totalPages <= 1) return null;
  const sortVal = sort ?? 'applied_desc';
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }} aria-label="Applications pagination">
      <Pagination
        page={page}
        totalPages={totalPages}
        label="Applications pagination"
        onChange={(next) =>
          router.push(employerApplicationsListHref({ page: next, status: status ?? undefined, sort: sortVal }))
        }
      />
    </nav>
  );
}
