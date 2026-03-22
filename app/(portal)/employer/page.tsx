import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Briefcase, FilePlus, Upload, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';
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
  const inReview = jobs.filter((j) => j.status === 'pending' || j.status === 'approved').length;
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
    { label: 'Active Postings', value: activeJobs, Icon: Briefcase },
    { label: 'Total Applications', value: totalApplications, Icon: Users },
    { label: 'In Review', value: inReview, Icon: Clock },
    { label: 'Filled/Closed', value: filledPositions, Icon: CheckCircle },
  ];

  return (
    <div className="employer-dash-page">
      <PageHeader
        title="Employer dashboard"
        subtitle="One place to post jobs, review applicants, and keep your hiring pipeline moving."
        action={
          <div className="employer-dash-header-actions">
            <Link href="/employer/jobs/import" className="btn btn-secondary">
              <Upload size={18} aria-hidden />
              Import from careers page
            </Link>
            <Link href="/employer/jobs/new" className="btn btn-primary">
              <FilePlus size={18} aria-hidden />
              Create posting
            </Link>
          </div>
        }
      />

      <section className="employer-dash-overview employer-dash-panel">
        <div className="employer-dash-overview-copy">
          <p className="employer-dash-eyebrow">Hiring overview</p>
          <h2>Paste your careers URL, review clean drafts, fix what you want, then publish.</h2>
          <p>
            Drafts stay private. Live postings and applications flow in one place — from URL to published job in minutes.
          </p>
        </div>
        <div className="employer-dash-stats" aria-label="Employer dashboard summary">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="employer-dash-stat">
              <div className="employer-dash-stat-icon" aria-hidden>
                <Icon size={18} />
              </div>
              <div className="employer-dash-stat-value">{value}</div>
              <div className="employer-dash-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="employer-dash-actions-panel employer-dash-panel">
        <div>
          <p className="employer-dash-eyebrow">Next move</p>
          <h2>Import, review, publish.</h2>
        </div>
        <div className="employer-dash-actions">
          <Link href="/employer/jobs/import" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Import from careers page</strong>
              <span>Paste one URL, get clean drafts. Edit, then send for review when ready.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/employer/jobs/new" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Create a posting</strong>
              <span>Add a role manually — pay, location, requirements — then submit for review.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/employer/jobs" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Manage postings</strong>
              <span>Edit drafts, track what is live, close roles when filled.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/employer/applications" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Review applicants</strong>
              <span>See submissions, respond quickly, keep placements moving.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="employer-dash-activity employer-dash-panel">
        <div className="employer-dash-section-heading">
          <div>
            <p className="employer-dash-eyebrow">Recent activity</p>
            <h2>Latest applicants</h2>
          </div>
          <Link href="/employer/applications" className="employer-dash-inline-link">
            View all applications
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="employer-dash-empty">No applications yet. Publish a job or import your current openings to start collecting candidates.</p>
        ) : (
          <ul className="employer-dash-activity-list">
            {recentApplications.map((app) => (
              <li key={app.id} className="employer-dash-activity-item">
                <div>
                  <strong>{app.student.fullName}</strong>
                  <span className="employer-dash-activity-separator"> applied to </span>
                  <Link href={`/employer/jobs/${app.jobId}`} className="employer-dash-activity-link">
                    {app.job.title}
                  </Link>
                </div>
                <div className="employer-dash-activity-item-meta">
                  {app.appliedAt.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
