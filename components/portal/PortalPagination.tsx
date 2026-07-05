'use client';

import { Pagination } from '@astryxdesign/core/Pagination';

/**
 * Shared portal pager — Astryx `Pagination` (numbered pages + prev/next).
 * Use for client-side page state (`onChange`) or URL-driven lists (wrap with router.push).
 */
export default function PortalPagination({
  page,
  totalPages,
  onChange,
  label = 'Pagination',
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}
      aria-label={label}
    >
      <Pagination page={page} totalPages={totalPages} label={label} onChange={onChange} />
    </nav>
  );
}
