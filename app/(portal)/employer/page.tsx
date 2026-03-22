import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Briefcase, FilePlus, Upload, Users, CheckCircle, Clock } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Employer Dashboard',
  description: 'Manage your job postings and view applications.',
  path: '/employer',
});

export default async function EmployerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const jobs = await prisma.job.findMany({
    where: { employerId: ctx.employerId },
    include: { _count: { select: { applications: true } } },
  });

  const activeJobs = jobs.filter((j) => j.status === 'live').length;
  const totalApplications = jobs.reduce((s, j) => s + j._count.applications, 0);
  const pendingApprovals = jobs.filter((j) => j.status === 'pending').length;
  const filledPositions = jobs.filter((j) => j.status === 'filled' || j.status === 'closed').length;

  const recentApplications = await prisma.jobPostingApplication.findMany({
    where: { job: { employerId: ctx.employerId } },
    orderBy: { appliedAt: 'desc' },
    take: 5,
    include: {
      job: { select: { title: true } },
      student: { select: { fullName: true } },
    },
  });

  const stats = [
    { label: 'Active Job Postings', value: activeJobs, Icon: Briefcase },
    { label: 'Total Applications', value: totalApplications, Icon: Users },
    { label: 'Pending Approvals', value: pendingApprovals, Icon: Clock },
    { label: 'Filled Positions', value: filledPositions, Icon: CheckCircle },
  ];

  return (
    <div>
      <PageHeader
        title="Employer dashboard"
        subtitle="Manage your job postings and view applications."
      />

      <div className="employer-dash-stats">
        {stats.map(({ label, value }) => (
          <div key={label} className="employer-dash-stat">
            <div className="employer-dash-stat-value">{value}</div>
            <div className="employer-dash-stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="employer-dash-actions">
        <Link href="/employer/jobs/new" className="btn btn-primary">
          <FilePlus size={18} aria-hidden />
          Post New Job
        </Link>
        <Link href="/employer/jobs/import" className="btn btn-secondary">
          <Upload size={18} aria-hidden />
          Import from LinkedIn/URL
        </Link>
        <Link href="/employer/applications" className="btn btn-ghost">
          View Applications
        </Link>
      </div>

      <h2 className="portal-page-title" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent activity</h2>
      {recentApplications.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No applications yet.</p>
      ) : (
        <ul className="employer-dash-activity-list">
          {recentApplications.map((app) => (
            <li key={app.id} className="employer-dash-activity-item">
              <strong>{app.student.fullName}</strong>
              <span style={{ color: 'var(--color-gray-500)' }}> applied to </span>
              <Link href={`/employer/jobs/${app.jobId}`} style={{ color: 'var(--color-accent)' }}>
                {app.job.title}
              </Link>
              <div className="employer-dash-activity-item-meta">
                {app.appliedAt.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
