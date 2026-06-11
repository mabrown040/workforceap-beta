import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import AdminJobsFilterTabs from '@/components/admin/AdminJobsFilterTabs';
import JobsTableClient from '@/components/admin/JobsTableClient';
import PageHeader from '@/components/portal/PageHeader';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { captureApiError } from '@/lib/observability/captureApiError';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin - Jobs',
  description: 'Manage employer job postings.',
  path: '/admin/jobs',
});
}

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

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/jobs');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const { filter } = await searchParams;
  const currentFilter = filter && ['all', 'pending', 'live', 'draft', 'filled', 'approved'].includes(filter)
    ? filter
    : 'pending';

  const where: { status?: object } = {};
  if (currentFilter === 'pending') where.status = { in: ['pending'] };
  else if (currentFilter === 'live') where.status = { in: ['live'] };
  else if (currentFilter === 'filled') where.status = { in: ['filled', 'closed'] };
  else if (currentFilter === 'draft') where.status = { in: ['draft'] };
  else if (currentFilter === 'approved') where.status = { in: ['approved'] };

  let jobs: any[] = [];
  let totalJobsInDb = 0;
  const countByStatus: Record<string, number> = {};
  let tabs: any[] = [];

  try {
    jobs = await prisma.job.findMany({
      take: 5000,
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        employer: { select: { companyName: true, contactEmail: true } },
        _count: { select: { applications: true } },
      },
    });

    const allCounts = await prisma.job.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    for (const r of allCounts) {
      if (r.status == null) continue;
      if (r.status === 'filled' || r.status === 'closed') {
        countByStatus['filled'] = (countByStatus['filled'] ?? 0) + r._count.id;
      } else {
        countByStatus[r.status] = r._count.id;
      }
    }

    totalJobsInDb = Object.values(countByStatus).reduce((a, b) => a + b, 0);

    tabs = [
      { value: 'pending', label: 'Pending', count: countByStatus['pending'] ?? 0 },
      { value: 'all', label: 'All', count: totalJobsInDb },
      { value: 'live', label: 'Live', count: countByStatus['live'] ?? 0 },
      { value: 'draft', label: 'Draft', count: countByStatus['draft'] ?? 0 },
      { value: 'filled', label: 'Filled / Closed', count: countByStatus['filled'] ?? 0 },
    ];

    await recordWorkflowDiagnostic({
      workflow: 'admin_review_queue',
      status: 'inspection',
      actorUserId: user.id,
      summary: `Admin opened jobs review queue (${currentFilter})`,
      method: 'page_load',
      metadata: { filter: currentFilter, queueCount: jobs.length },
    });
  } catch (error) {
    captureApiError(error, { route: 'admin/jobs' });
    return (
      <div>
        <PageHeader title="Jobs" subtitle="Employer submits → Admin reviews → Approve/Reject → Live. Manage job postings." />
        <div
          role="alert"
          style={{
            margin: '1.5rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '0.75rem',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid #b91c1c',
            color: '#b91c1c',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Error loading jobs</h2>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            The query failed and the list above is empty as a result. Sentry has been notified.
            Refresh the page or check server logs if this persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Jobs" subtitle="Employer submits → Admin reviews → Approve or reject, then publish roles live." />

      <AdminJobsFilterTabs currentFilter={currentFilter} tabs={tabs} />

      <div className="md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            className="portal-card portal-card--flat"
            style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <Link href={`/admin/jobs/${job.id}`} style={{ fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}>
                  {job.title}
                </Link>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                  {job.employer?.companyName ?? 'Unknown company'}
                </p>
              </div>
              <span className={getJobStatusPillClass(job.status)}>
                {STATUS_LABELS[job.status] ?? job.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                  Applications
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', fontWeight: 700 }}>{job._count?.applications ?? 0}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                  Queue
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>{currentFilter}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href={`/admin/jobs/${job.id}`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Review job
              </Link>
              <Link href={`/admin/jobs/${job.id}#matches`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
                View AI matches
              </Link>
            </div>
          </div>
        ))}
      </div>

      <JobsTableClient jobs={jobs} />

      {jobs.length === 0 && (
        <p style={{ color: 'var(--color-on-surface-variant)', marginTop: '1rem' }}>
          {totalJobsInDb === 0 ? (
            'No jobs yet.'
          ) : (
            <>
              No jobs in this view ({currentFilter}).{' '}
              <Link href="/admin/jobs?filter=all" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                Show all ({totalJobsInDb})
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
