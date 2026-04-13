import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerJobsBoard from '@/components/employer/EmployerJobsBoard';
import { assessJobPostingReadiness } from '@/lib/employer/jobReadiness';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import {
  EMPLOYER_JOBS_PAGE_SIZE,
  employerJobsListHref,
  parseEmployerJobsListQuery,
  prismaWhereClosableInListFilter,
  prismaWhereDeletableInListFilter,
  prismaWhereEmployerJobList,
} from '@/lib/employer/employerJobsListQuery';
import { employerJobStatusBadgeVariant, employerJobStatusLabel } from '@/lib/employer/jobStatusDisplay';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Jobs',
  description: 'Manage your job postings.',
  path: '/employer/jobs',
});

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
      statusLabel: employerJobStatusLabel(j.status),
      applicationsCount: j._count.applications,
      updatedAt: j.updatedAt.toISOString(),
      readinessLevel: readiness.level,
      readinessIssues: readiness.issues,
    };
  });

  const titleByIdInFilter: Record<string, string> = {};
  for (const r of titlesInFilter) titleByIdInFilter[r.id] = r.title;

  const FILTER_CHIPS = [
    { value: '', label: 'All' },
    { value: 'live', label: 'Live' },
    { value: 'draft', label: 'Draft' },
    { value: 'filled', label: 'Filled' },
  ];

  return (
    <>
      <h1 className="wa-sr-only">My Jobs</h1>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="My Jobs"
          subtitle="Manage your job postings and review candidate activity."
          action={(
            <Link
              href="/employer/jobs/new"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.875rem', background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent-dark))', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
              Post Job
            </Link>
          )}
        />

        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1rem 0.75rem' }}>
          {FILTER_CHIPS.map((chip) => (
            <Link
              key={chip.value}
              href={chip.value ? `/employer/jobs?filter=${chip.value}` : '/employer/jobs'}
              style={{
                flexShrink: 0,
                padding: '0.375rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
                background: filter === chip.value ? 'var(--color-accent)' : 'var(--surface-container)',
                color: filter === chip.value ? '#fff' : 'var(--color-on-surface-variant)',
              }}
            >
              {chip.label}
            </Link>
          ))}
        </div>

        {/* Job cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0 1rem' }}>
          {boardItems.length === 0 && totalInDb > 0 ? (
            <div className="portal-card portal-card--flat" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>filter_alt_off</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>Nothing in this view</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
                Try another filter or see all postings.
              </p>
              <Link
                href="/employer/jobs"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
              >
                Show all postings
              </Link>
            </div>
          ) : boardItems.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>work_outline</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>No jobs yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>Post your first role to start receiving AI-matched candidates.</p>
              <Link
                href="/employer/jobs/new"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>Post a Job
              </Link>
            </div>
          ) : (
            boardItems.map((job) => (
              <div
                key={job.id}
                className="portal-card portal-card--flat"
                style={{
                  padding: '1rem',
                  border: job.status === 'draft' ? '1px dashed var(--outline-variant)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <h3 className="wa-truncate" style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0, flex: 1, paddingRight: '0.5rem' }}>
                    {job.title}
                  </h3>
                  <StatusBadge label={job.statusLabel} variant={employerJobStatusBadgeVariant(job.status)} />
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}>{job.location}</p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.775rem', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>person</span>
                    {job.applicationsCount} applicants
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/employer/jobs/${job.id}`}
                    style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'var(--surface-container)', color: 'var(--color-on-surface)', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                    className="active:wa-scale-95 wa-transition-transform"
                  >
                    View
                  </Link>
                  <Link
                    href={`/employer/applications?job=${job.id}`}
                    style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: 'var(--surface-container-low)', color: 'var(--color-accent)', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                    className="active:wa-scale-95 wa-transition-transform"
                  >
                    Applications
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        <MobileBottomNav variant="employer" />
      </div>

      {/* ── Desktop section ── */}
      <div className="wa-hidden wa-md:wa-block">
        <PortalPageFrame>
          <PageHeader
            title="My Jobs"
            subtitle="Manage your job postings, review drafts, and track live roles."
            action={(
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  href="/employer/jobs/import"
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'var(--surface-container-high)',
                    color: 'var(--color-accent)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Import Jobs
                </Link>
                <Link
                  href="/employer/jobs/new"
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark, #670024) 100%)',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Post a Job
                </Link>
              </div>
            )}
          />

          {totalInDb === 0 ? (
            <div className="portal-card portal-card--flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }}>work_outline</span>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>No jobs yet</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', maxWidth: '28rem', marginInline: 'auto' }}>
                Post a single role or import multiple jobs to start receiving AI-matched candidates.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                <Link href="/employer/jobs/new" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                  Post your first job
                </Link>
                <Link href="/employer/jobs/import" style={{ padding: '0.625rem 1.25rem', border: '1px solid var(--outline-variant)', color: 'var(--color-on-surface)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                  Import jobs
                </Link>
              </div>
            </div>
          ) : (
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
          )}
        </PortalPageFrame>
      </div>
    </>
  );
}
