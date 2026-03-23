import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import EmployerJobsBoard from '@/components/employer/EmployerJobsBoard';
import { assessJobPostingReadiness } from '@/lib/employer/jobReadiness';
import {
  EMPLOYER_JOBS_PAGE_SIZE,
  employerJobsListHref,
  parseEmployerJobsListQuery,
  prismaWhereClosableInListFilter,
  prismaWhereDeletableInListFilter,
  prismaWhereEmployerJobList,
} from '@/lib/employer/employerJobsListQuery';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Jobs',
  description: 'Manage your job postings.',
  path: '/employer/jobs',
});

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'In review',
  approved: 'Approved',
  live: 'Live',
  filled: 'Filled',
  closed: 'Closed',
};

type SearchProps = { searchParams: Promise<{ page?: string; filter?: string }> };

export default async function EmployerJobsPage({ searchParams }: SearchProps) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const sp = await searchParams;
  const { filter, page } = parseEmployerJobsListQuery(sp);
  const employerId = ctx.employerId;

  const listWhere = prismaWhereEmployerJobList(employerId, filter);

  const [totalInDb, totalInFilter, jobs, deletableRows, closableRows, titlesInFilter] = await Promise.all([
    prisma.job.count({ where: { employerId } }),
    prisma.job.count({ where: listWhere }),
    prisma.job.findMany({
      where: listWhere,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * EMPLOYER_JOBS_PAGE_SIZE,
      take: EMPLOYER_JOBS_PAGE_SIZE,
      include: { _count: { select: { applications: true } } },
    }),
    prisma.job.findMany({
      where: prismaWhereDeletableInListFilter(employerId, filter),
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.job.findMany({
      where: prismaWhereClosableInListFilter(employerId, filter),
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.job.findMany({
      where: listWhere,
      select: { id: true, title: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalInFilter / EMPLOYER_JOBS_PAGE_SIZE));
  if (totalInFilter > 0 && page > totalPages) {
    redirect(employerJobsListHref(filter, totalPages));
  }

  const boardItems = jobs.map((j) => {
    const desc = j.description?.trim() ?? '';
    const location = j.location?.trim() || '';
    const readiness = assessJobPostingReadiness({
      location: location || '—',
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      description: desc,
      requirementsCount: j.requirements?.length ?? 0,
      suggestedProgramsCount: j.suggestedPrograms?.length ?? 0,
    });
    return {
      id: j.id,
      title: j.title,
      location: location || '—',
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      locationType: j.locationType,
      jobType: j.jobType,
      descriptionPreview: desc.length > 180 ? `${desc.slice(0, 180).trim()}…` : desc || '—',
      descriptionLength: desc.length,
      requirementsCount: j.requirements?.length ?? 0,
      suggestedProgramsCount: j.suggestedPrograms?.length ?? 0,
      status: j.status,
      statusLabel: STATUS_LABELS[j.status] ?? j.status,
      applicationsCount: j._count.applications,
      updatedAt: j.updatedAt.toISOString(),
      readinessLevel: readiness.level,
      readinessIssues: readiness.issues,
    };
  });

  const titleByIdInFilter: Record<string, string> = {};
  for (const r of titlesInFilter) titleByIdInFilter[r.id] = r.title;

  return (
    <div className="employer-jobs-page">
      <header className="employer-jobs-header">
        <h1>My Jobs</h1>
        <div className="employer-jobs-actions">
          <Link href="/employer/jobs/import" className="btn btn-secondary btn-sm">
            Import
          </Link>
          <Link href="/employer/jobs/new" className="btn btn-primary btn-sm">
            Post Job
          </Link>
        </div>
      </header>
      <EmployerJobsBoard
        jobs={boardItems}
        filter={filter}
        page={page}
        pageSize={EMPLOYER_JOBS_PAGE_SIZE}
        totalInFilter={totalInFilter}
        totalInDb={totalInDb}
        deletableInFilter={deletableRows}
        closableInFilter={closableRows}
        titleByIdInFilter={titleByIdInFilter}
      />
    </div>
  );
}
