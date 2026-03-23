import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Briefcase, FilePlus, Upload, Users, CheckCircle, Clock, ArrowRight, Sparkles, Calendar, UserCheck, Timer } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Employer overview',
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

  const jobIds = jobs.map((j) => j.id);

  const [totalMatches, interviewPipelineCount, hiredApplications, filledJobsCount] = await Promise.all([
    jobIds.length === 0
      ? Promise.resolve(0)
      : prisma.aIJobMatch.count({ where: { jobId: { in: jobIds } } }),
    prisma.jobPostingApplication.count({
      where: {
        job: { employerId: ctx.employerId },
        status: { in: ['interview', 'offered', 'hired'] },
      },
    }),
    prisma.jobPostingApplication.findMany({
      where: { job: { employerId: ctx.employerId }, status: 'hired' },
      select: {
        jobId: true,
        studentId: true,
        statusUpdatedAt: true,
        appliedAt: true,
      },
    }),
    prisma.job.count({ where: { employerId: ctx.employerId, status: 'filled' } }),
  ]);

  const hiresFromApplications = hiredApplications.length;
  const hiresTotal = hiresFromApplications + filledJobsCount;

  let avgMatchToHireDays: number | null = null;
  if (hiredApplications.length > 0) {
    const matchRows = await prisma.aIJobMatch.findMany({
      where: {
        OR: hiredApplications.map((h) => ({ jobId: h.jobId, studentId: h.studentId })),
      },
      select: { jobId: true, studentId: true, createdAt: true },
    });
    const matchMap = new Map(matchRows.map((m) => [`${m.jobId}:${m.studentId}`, m.createdAt]));
    const deltas: number[] = [];
    for (const h of hiredApplications) {
      const start = matchMap.get(`${h.jobId}:${h.studentId}`);
      const end = h.statusUpdatedAt ?? h.appliedAt;
      if (start && end && end.getTime() >= start.getTime()) {
        deltas.push(end.getTime() - start.getTime());
      }
    }
    if (deltas.length > 0) {
      avgMatchToHireDays = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / (1000 * 60 * 60 * 24));
    }
  }

  const stats = [
    { label: 'Active Postings', value: activeJobs, Icon: Briefcase },
    { label: 'Total Applications', value: totalApplications, Icon: Users },
    { label: 'In Review', value: inReview, Icon: Clock },
    { label: 'Filled/Closed', value: filledPositions, Icon: CheckCircle },
  ];

  const placementStats = [
    { label: 'Members matched to your roles', value: totalMatches, Icon: Sparkles },
    { label: 'Interviews or later (pipeline)', value: interviewPipelineCount, Icon: Calendar },
    { label: 'Hires (apps + filled roles)', value: hiresTotal, Icon: UserCheck },
    {
      label: 'Avg. days match → hire',
      value: avgMatchToHireDays === null ? '—' : avgMatchToHireDays,
      Icon: Timer,
    },
  ];

  return (
    <div className="employer-dash-page">
      <PageHeader
        title="Employer overview"
        subtitle="One place to post jobs, review applicants, and keep your hiring pipeline moving."
        action={
          <div className="employer-dash-header-actions">
            <Link href="/employer/jobs/import" className="btn btn-secondary">
              <Upload size={18} aria-hidden />
              Import jobs
            </Link>
            <Link href="/employer/jobs/new" className="btn btn-primary">
              <FilePlus size={18} aria-hidden />
              Post a job
            </Link>
          </div>
        }
      />

      <section className="employer-dash-overview employer-dash-panel">
        <div className="employer-dash-overview-copy">
          <p className="employer-dash-eyebrow">Hiring overview</p>
          <h2>See what needs attention before you publish or hire.</h2>
          <p>
            Draft imports, live postings, and incoming applications stay in one workflow so your team can move from URL to published job without bouncing between views.
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

      <section className="employer-dash-placements employer-dash-panel" aria-label="Placement statistics">
        <div className="employer-dash-overview-copy">
          <p className="employer-dash-eyebrow">Placement snapshot</p>
          <h2>How WorkforceAP candidates are moving through your pipeline.</h2>
          <p>
            Totals include suggested matches, interview-stage applications, and hires. Filled job postings count toward hires when you mark a role filled.
          </p>
        </div>
        <div className="employer-dash-stats employer-dash-stats--placement">
          {placementStats.map(({ label, value, Icon }) => (
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
          <h2>Hire in three steps: create, review, place.</h2>
        </div>
        <div className="employer-dash-actions">
          <Link href="/employer/jobs/new" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Create a posting</strong>
              <span>Add a role, set pay and location, then submit for WorkforceAP review.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/employer/jobs" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Manage postings</strong>
              <span>Edit drafts, track what is live, and close roles once filled.</span>
            </span>
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/employer/applications" className="employer-dash-action-link">
            <span className="employer-dash-action-copy">
              <strong>Review applicants</strong>
              <span>See recent submissions, respond quickly, and keep placements moving.</span>
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
