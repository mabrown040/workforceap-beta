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

  return (
    <div>
      <PageHeader
        title="Employer dashboard"
        subtitle="Manage your job postings and view applications."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Active Job Postings', value: activeJobs, icon: Briefcase },
          { label: 'Total Applications', value: totalApplications, icon: Users },
          { label: 'Pending Approvals', value: pendingApprovals, icon: Clock },
          { label: 'Filled Positions', value: filledPositions, icon: CheckCircle },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-light)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <Link href="/employer/jobs/new" className="btn btn-primary">
          <FilePlus size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Post New Job
        </Link>
        <Link href="/employer/jobs/import" className="btn btn-secondary">
          <Upload size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Import from LinkedIn/URL
        </Link>
        <Link href="/employer/applications" className="btn btn-ghost">
          View Applications
        </Link>
      </div>

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Recent activity</h2>
      {recentApplications.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)' }}>No applications yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {recentApplications.map((app) => (
            <li
              key={app.id}
              style={{
                padding: '0.65rem 0',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '0.9rem',
              }}
            >
              <strong>{app.student.fullName}</strong>
              <span style={{ color: 'var(--color-gray-500)' }}> applied to </span>
              <Link href={`/employer/jobs/${app.jobId}`} style={{ color: 'var(--color-accent)' }}>
                {app.job.title}
              </Link>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                {app.appliedAt.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
