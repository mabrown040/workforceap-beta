import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import EmployerJobsBoard from '@/components/employer/EmployerJobsBoard';
import { assessJobPostingReadiness } from '@/lib/employer/jobReadiness';
import MobileBottomNav from '@/components/MobileBottomNav';
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

  const statusBadgeStyle = (status: string): React.CSSProperties => {
    if (status === 'live') return { background: '#dcfce7', color: '#166534' };
    if (status === 'draft') return { background: '#f3f4f6', color: '#6b7280' };
    if (status === 'filled') return { background: '#dbeafe', color: '#1e40af' };
    if (status === 'pending') return { background: '#fef9c3', color: '#854d0e' };
    return { background: '#f3f4f6', color: '#6b7280' };
  };

  const FILTER_CHIPS = [
    { value: '', label: 'All' },
    { value: 'live', label: 'Live' },
    { value: 'draft', label: 'Draft' },
    { value: 'filled', label: 'Filled' },
  ];

  return (
    <>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>My Jobs</h1>
          <Link
            href="/employer/jobs/new"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.875rem', background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent-dark))', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
            Post Job
          </Link>
        </div>

        {/* Filter chips */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', padding: '0 1rem 0.75rem', scrollbarWidth: 'none' }}>
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
          {boardItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface-container-low)', borderRadius: '0.875rem', border: '1px solid #ebe7e7' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>work_outline</span>
              <p style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>No jobs yet</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>Post your first role to start receiving AI-matched candidates.</p>
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
                style={{
                  background: '#fff',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: job.status === 'draft' ? '1px dashed #debfc2' : '1px solid #ebe7e7',
                  boxShadow: '0 1px 4px rgba(28,27,27,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <h3 className="truncate" style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0, flex: 1, paddingRight: '0.5rem' }}>
                    {job.title}
                  </h3>
                  <span style={{ ...statusBadgeStyle(job.status), padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {job.statusLabel}
                  </span>
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
                    className="active:scale-95 transition-transform"
                  >
                    View
                  </Link>
                  <Link
                    href={`/employer/applications?job=${job.id}`}
                    style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#fff1f2', color: 'var(--color-accent)', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                    className="active:scale-95 transition-transform"
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
      </div>
    </>
  );
}
