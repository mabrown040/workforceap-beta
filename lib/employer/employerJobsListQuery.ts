import type { Prisma } from '@prisma/client';

export const EMPLOYER_JOBS_PAGE_SIZE = 10;

export const EMPLOYER_JOB_FILTER_VALUES = ['all', 'draft', 'review', 'live', 'filled'] as const;
export type EmployerJobListFilter = (typeof EMPLOYER_JOB_FILTER_VALUES)[number];

export function parseEmployerJobsListQuery(raw: { page?: string; filter?: string }): {
  filter: EmployerJobListFilter;
  page: number;
} {
  const filter = EMPLOYER_JOB_FILTER_VALUES.includes(raw.filter as EmployerJobListFilter)
    ? (raw.filter as EmployerJobListFilter)
    : 'all';
  const pageRaw = parseInt(raw.page ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  return { filter, page };
}

export function prismaWhereEmployerJobList(employerId: string, filter: EmployerJobListFilter): Prisma.JobWhereInput {
  const base: Prisma.JobWhereInput = { employerId };
  if (filter === 'all') return base;
  if (filter === 'draft') return { ...base, status: 'draft' };
  if (filter === 'live') return { ...base, status: 'live' };
  if (filter === 'filled') return { ...base, status: { in: ['filled', 'closed'] } };
  if (filter === 'review') return { ...base, status: { in: ['pending', 'approved'] } };
  return base;
}

/** Build `/employer/jobs` URL with query (omit defaults). */
export function employerJobsListHref(filter: EmployerJobListFilter, page: number): string {
  const p = new URLSearchParams();
  if (filter !== 'all') p.set('filter', filter);
  if (page > 1) p.set('page', String(page));
  const q = p.toString();
  return q ? `/employer/jobs?${q}` : '/employer/jobs';
}

const BULK_DELETABLE_STATUSES = ['draft', 'pending', 'filled', 'closed'] as const;
const BULK_CLOSABLE_STATUSES = ['live', 'approved'] as const;

export function prismaWhereDeletableInListFilter(
  employerId: string,
  filter: EmployerJobListFilter
): Prisma.JobWhereInput {
  const listWhere = prismaWhereEmployerJobList(employerId, filter);
  return {
    AND: [listWhere, { status: { in: [...BULK_DELETABLE_STATUSES] } }],
  };
}

export function prismaWhereClosableInListFilter(
  employerId: string,
  filter: EmployerJobListFilter
): Prisma.JobWhereInput {
  const listWhere = prismaWhereEmployerJobList(employerId, filter);
  return {
    AND: [listWhere, { status: { in: [...BULK_CLOSABLE_STATUSES] } }],
  };
}
