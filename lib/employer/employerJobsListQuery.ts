import type { Prisma } from '@prisma/client';

export const EMPLOYER_JOBS_PAGE_SIZE = 10;

export const EMPLOYER_JOB_FILTER_VALUES = ['all', 'draft', 'review', 'live', 'filled', 'expired'] as const;
export type EmployerJobListFilter = (typeof EMPLOYER_JOB_FILTER_VALUES)[number];

export const EMPLOYER_JOB_LOCATION_TYPE_VALUES = ['remote', 'hybrid', 'onsite'] as const;
export type EmployerJobLocationType = (typeof EMPLOYER_JOB_LOCATION_TYPE_VALUES)[number] | '';

export function parseEmployerJobsListQuery(raw: { page?: string; filter?: string; locationType?: string }): {
  filter: EmployerJobListFilter;
  locationType: EmployerJobLocationType;
  page: number;
} {
  const filter = EMPLOYER_JOB_FILTER_VALUES.includes(raw.filter as EmployerJobListFilter)
    ? (raw.filter as EmployerJobListFilter)
    : 'all';
  const locationType = (raw.locationType && ['remote', 'hybrid', 'onsite'].includes(raw.locationType))
    ? (raw.locationType as EmployerJobLocationType)
    : '';
  const pageRaw = parseInt(raw.page ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  return { filter, locationType, page };
}

export function prismaWhereEmployerJobList(
  employerId: string,
  filter: EmployerJobListFilter,
  locationType?: EmployerJobLocationType
): Prisma.JobWhereInput {
  const base: Prisma.JobWhereInput = { employerId };
  if (locationType) {
    base.locationType = locationType as 'remote' | 'hybrid' | 'onsite';
  }
  if (filter === 'all') return base;
  if (filter === 'draft') return { ...base, status: 'draft' };
  if (filter === 'live') return { ...base, status: 'live', AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }] };
  if (filter === 'filled') return { ...base, status: { in: ['filled', 'closed'] } };
  if (filter === 'review') return { ...base, status: { in: ['pending', 'approved'] } };
  if (filter === 'expired') return { ...base, status: 'live', AND: [{ expiresAt: { lt: new Date() } }] };
  return base;
}

/** Build `/employer/jobs` URL with query (omit defaults). */
export function employerJobsListHref(filter: EmployerJobListFilter, page: number, locationType?: EmployerJobLocationType): string {
  const p = new URLSearchParams();
  if (filter !== 'all') p.set('filter', filter);
  if (locationType) p.set('locationType', locationType);
  if (page > 1) p.set('page', String(page));
  const q = p.toString();
  return q ? `/employer/jobs?${q}` : '/employer/jobs';
}

const BULK_DELETABLE_STATUSES = ['draft', 'pending', 'filled', 'closed'] as const;
const BULK_CLOSABLE_STATUSES = ['live', 'approved'] as const;

export function prismaWhereDeletableInListFilter(
  employerId: string,
  filter: EmployerJobListFilter,
  locationType?: EmployerJobLocationType
): Prisma.JobWhereInput {
  const listWhere = prismaWhereEmployerJobList(employerId, filter, locationType);
  return {
    AND: [listWhere, { status: { in: [...BULK_DELETABLE_STATUSES] } }],
  };
}

export function prismaWhereClosableInListFilter(
  employerId: string,
  filter: EmployerJobListFilter,
  locationType?: EmployerJobLocationType
): Prisma.JobWhereInput {
  const listWhere = prismaWhereEmployerJobList(employerId, filter, locationType);
  return {
    AND: [listWhere, { status: { in: [...BULK_CLOSABLE_STATUSES] } }],
  };
}
