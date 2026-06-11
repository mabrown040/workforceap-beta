'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Filter-chip row for /admin/members and the flavored member-list pages.
 *
 * The sidebar was collapsed to a single "Students" entry. These chips give
 * the operator a one-click path between the four student-list views that
 * used to live in the sidebar:
 *
 *   - All students   → /admin/members
 *   - Interview ready → /admin/members/interview-ready
 *   - Job ready (70%+) → /admin/members/job-ready
 *   - Duplicates     → /admin/members/duplicates
 *
 * Every underlying route still exists; the chips are pure navigation. Labels
 * intentionally avoid jargon (no "Pipeline" / "Funnel" / "Cohort" / "SLA").
 */

type ChipDef = {
  href: string;
  label: string;
  /** Used for active matching. */
  match: (pathname: string) => boolean;
};

const CHIPS: ChipDef[] = [
  {
    href: '/admin/members',
    label: 'All students',
    // Exact match — /admin/members/* children are their own chips below.
    match: (p) => p === '/admin/members',
  },
  {
    href: '/admin/members/interview-ready',
    label: 'Interview ready',
    match: (p) => p.startsWith('/admin/members/interview-ready'),
  },
  {
    href: '/admin/members/job-ready',
    label: 'Job ready (70%+)',
    match: (p) => p.startsWith('/admin/members/job-ready'),
  },
  {
    href: '/admin/members/duplicates',
    label: 'Duplicates',
    match: (p) => p.startsWith('/admin/members/duplicates'),
  },
];

export default function MembersListNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label="Student list views"
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '1.25rem',
      }}
    >
      {CHIPS.map((chip) => {
        const isActive = chip.match(pathname);
        return (
          <Link
            key={chip.href}
            href={chip.href}
            aria-current={isActive ? 'page' : undefined}
            className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {chip.label}
          </Link>
        );
      })}
    </nav>
  );
}
