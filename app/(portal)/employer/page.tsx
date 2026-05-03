import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import PortalCard from '@/components/portal/ui/PortalCard';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  employerJobPostingApplicationStatusBadgeVariant,
  employerJobPostingApplicationStatusLabel,
} from '@/lib/employer/jobPostingApplicationStatus';

export const metadata: Metadata = buildPageMetadata({
  title: 'Employer Portal',
  description: 'Manage your job postings and review applicants.',
  path: '/employer',
});

export default async function EmployerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer');

  const superAdmin = await isSuperAdmin(user.id);
  const ctx = await getEmployerForUser(user.id, { isSuperAdminHint: superAdmin });
  if (!ctx) {
    // No employer context — super admin without cookie, or non-employer user
    if (superAdmin) redirect('/admin/employers');
    redirect('/dashboard');
  }

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    include: {
      jobs: {
        orderBy: { createdAt: 'desc' },
        include: {
          applications: {
            include: {
              student: { select: { id: true, fullName: true, email: true, phone: true } },
            },
            orderBy: { appliedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!employer) redirect('/dashboard');

  const totalJobs = employer.jobs.length;
  const liveJobs = employer.jobs.filter((j) => j.status === 'live').length;
  const totalApplicants = employer.jobs.reduce(
    (sum, j) => sum + j.applications.length,
    0
  );
  const newApplicants = employer.jobs.reduce(
    (sum, j) => sum + j.applications.filter((a) => a.status === 'pending').length,
    0
  );

  return (
    <PortalPageFrame maxWidth="80rem">
      <h1 className="wa-sr-only">Employer Portal — {employer.companyName}</h1>

      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <p
          className="wa-text-[11px] wa-uppercase wa-tracking-[0.15em] wa-font-bold wa-mb-1"
          style={{ color: 'var(--color-accent)' }}
        >
          Employer Portal
        </p>
        <h2
          className="wa-text-3xl wa-font-extrabold wa-tracking-tight"
          style={{ color: 'var(--color-on-surface)', lineHeight: 1.1 }}
        >
          {employer.companyName}
        </h2>
        {superAdmin && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-on-surface-variant)',
              marginTop: '0.25rem',
            }}
          >
            Viewing as super admin
          </p>
        )}
      </div>

      {/* KPI Grid */}
      <div
        className="portal-kpi-grid portal-pad-x"
        style={{ paddingTop: '1rem', paddingBottom: '1rem' }}
      >
        <PortalKpiCard accent="accent" label="Total Jobs" value={totalJobs} hint="All postings" />
        <PortalKpiCard accent="green" label="Live Jobs" value={liveJobs} hint="Currently active" />
        <PortalKpiCard accent="blue" label="Applicants" value={totalApplicants} hint="Total received" />
        <PortalKpiCard accent="gold" label="New" value={newApplicants} hint="Pending review" />
      </div>

      {/* Jobs + Applicants */}
      <div className="portal-pad-x" style={{ paddingBottom: '2rem' }}>
        {employer.jobs.length === 0 ? (
          <PortalCard className="portal-card--flat">
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '2.5rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', display: 'block' }}
              >
                work
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                No job postings yet
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
                Post your first job to start receiving applicants from WorkforceAP members.
              </p>
              {superAdmin ? (
                <Link href="/admin/jobs" className="btn btn-primary">
                  Post a Job (Admin)
                </Link>
              ) : (
                <Link href="/employer/jobs/new" className="btn btn-primary">
                  Post a Job
                </Link>
              )}
            </div>
          </PortalCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {employer.jobs.map((job) => (
              <PortalCard key={job.id} className="portal-card--flat">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                      {job.title}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        fontSize: '0.75rem',
                        color: 'var(--color-on-surface-variant)',
                      }}
                    >
                      <StatusBadge
                        label={
                          job.status === 'live'
                            ? 'Live'
                            : job.status === 'pending'
                              ? 'Pending'
                              : job.status === 'draft'
                                ? 'Draft'
                                : job.status === 'filled'
                                  ? 'Filled'
                                  : job.status === 'closed'
                                    ? 'Closed'
                                    : job.status
                        }
                        variant={
                          job.status === 'live'
                            ? 'success'
                            : job.status === 'pending'
                              ? 'warning'
                              : job.status === 'draft'
                                ? 'neutral'
                                : 'neutral'
                        }
                      />
                      <span>{job.location ?? 'Location not specified'}</span>
                      <span>·</span>
                      <span>{job.jobType}</span>
                      {job.salaryMin != null && (
                        <>
                          <span>·</span>
                          <span>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(job.salaryMin)}
                            {job.salaryMax != null ? ` – ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(job.salaryMax)}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--color-accent)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {job.applications.length} applicant{job.applications.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Applicants Table */}
                {job.applications.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <table
                      className="admin-table"
                      style={{ fontSize: '0.8125rem', width: '100%' }}
                    >
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Status</th>
                          <th>Applied</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.applications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{app.student.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                                {app.student.email}
                              </div>
                            </td>
                            <td>
                              <StatusBadge
                                label={employerJobPostingApplicationStatusLabel(app.status)}
                                variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                              />
                            </td>
                            <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                            <td>
                              <Link
                                href={`/employer/applications/${app.id}`}
                                className="btn btn-outline btn-sm"
                              >
                                Review
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {job.applications.length === 0 && (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-on-surface-variant)',
                      marginTop: '0.75rem',
                    }}
                  >
                    No applicants yet. Share this job with WorkforceAP members to attract candidates.
                  </p>
                )}
              </PortalCard>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav variant="portal" />
    </PortalPageFrame>
  );
}
