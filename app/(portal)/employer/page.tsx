import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Briefcase, FilePlus, Upload, Users, CheckCircle, Clock, ArrowRight, Sparkles, Calendar, UserCheck, Timer } from 'lucide-react';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { EMPLOYER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';

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

  const employerRow = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: {
      onboardingCompletedAt: true,
      tourCompletedAt: true,
      companyName: true,
      industry: true,
      companySize: true,
      companyWebsite: true,
    },
  });
  if (!employerRow) redirect('/employers');

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

  const showEmployerOnboarding = employerRow.onboardingCompletedAt == null;
  const showEmployerTour =
    employerRow.onboardingCompletedAt != null && employerRow.tourCompletedAt == null;
  const superAdmin = await isSuperAdmin(user.id);

  const placementStats = [
    { label: 'Members matched to your roles', value: totalMatches, Icon: Sparkles },
    { label: 'Interviews or later (pipeline)', value: interviewPipelineCount, Icon: Calendar },
    { label: 'Hires (apps + filled roles)', value: hiresTotal, Icon: UserCheck },
    {
      label: 'Avg. days match to hire',
      value: avgMatchToHireDays === null ? '\u2014' : avgMatchToHireDays,
      Icon: Timer,
    },
  ];

  const bottomStats = [
    { label: 'Active Postings', value: activeJobs, Icon: Briefcase },
    { label: 'Total Applications', value: totalApplications, Icon: Users },
    { label: 'Avg. Match-to-Hire Days', value: avgMatchToHireDays === null ? '\u2014' : avgMatchToHireDays, Icon: Clock },
    { label: 'Filled Positions', value: filledPositions, Icon: CheckCircle },
  ];

  return (
    <PortalEntryClient
      portal="employer"
      showOnboardingWizard={showEmployerOnboarding}
      showTour={showEmployerTour}
      isSuperAdmin={superAdmin}
      tourSteps={EMPLOYER_PORTAL_TOUR_STEPS}
      wizardProps={{
        companyName: employerRow.companyName,
        industry: employerRow.industry ?? '',
        companySize: employerRow.companySize ?? '',
        companyWebsite: employerRow.companyWebsite ?? '',
      }}
    >
    <div className="wa-space-y-8">
      {/* ── Hero header ── */}
      <header className="wa-flex wa-flex-col sm:wa-flex-row wa-items-start sm:wa-items-end wa-justify-between wa-gap-4">
        <div>
          <h1 className="wa-text-3xl wa-font-extrabold wa-tracking-tight wa-text-m3-on-surface">
            Welcome back, {employerRow.companyName}.
          </h1>
          <p className="wa-mt-1 wa-text-sm wa-text-m3-on-surface-variant">
            {activeJobs} active posting{activeJobs === 1 ? '' : 's'} &middot; {totalApplications} total application{totalApplications === 1 ? '' : 's'} &middot; {hiresTotal} hire{hiresTotal === 1 ? '' : 's'}
          </p>
        </div>
        <div className="wa-flex wa-items-center wa-gap-3">
          <Link
            href="/employer/jobs/import"
            className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface wa-transition-colors hover:wa-bg-m3-surface-container-high"
          >
            <Upload size={16} aria-hidden />
            Import jobs
          </Link>
          <Link
            href="/employer/jobs/new"
            className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-bg-m3-primary wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-primary wa-transition-colors hover:wa-bg-m3-primary/90"
            data-tour="tour-post-job"
          >
            <FilePlus size={16} aria-hidden />
            Post a job
          </Link>
        </div>
      </header>

      {/* ── Empty state ── */}
      {jobs.length === 0 && (
        <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-8 wa-text-center">
          <h3 className="wa-text-lg wa-font-bold wa-text-m3-on-surface wa-mb-2">
            Welcome &mdash; start with your first posting
          </h3>
          <p className="wa-text-sm wa-text-m3-on-surface-variant wa-mb-4 wa-max-w-lg wa-mx-auto">
            You do not have any job drafts or live roles yet. Post a single role, or import a list from a spreadsheet or careers URL. WorkforceAP reviews submissions before they go live on the public board.
          </p>
          <div className="wa-flex wa-flex-wrap wa-justify-center wa-gap-3">
            <Link
              href="/employer/jobs/new"
              className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-bg-m3-primary wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-primary"
            >
              Post your first job
            </Link>
            <Link
              href="/employer/jobs/import"
              className="wa-inline-flex wa-items-center wa-gap-2 wa-rounded-full wa-border wa-border-m3-outline wa-px-5 wa-py-2.5 wa-text-sm wa-font-semibold wa-text-m3-on-surface"
            >
              Import jobs
            </Link>
          </div>
        </div>
      )}

      {/* ── Bento grid ── */}
      <div className="wa-grid wa-grid-cols-12 wa-gap-4">
        {/* Large card: Talent Pipeline */}
        <div className="wa-col-span-12 lg:wa-col-span-8 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <div className="wa-flex wa-items-center wa-justify-between wa-mb-4">
            <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary">
              Talent Pipeline
            </p>
            <Link
              href="/employer/applications"
              className="wa-text-xs wa-font-semibold wa-text-m3-primary hover:wa-underline wa-inline-flex wa-items-center wa-gap-1"
            >
              View all <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="wa-text-sm wa-text-m3-on-surface-variant wa-py-4">
              No applications yet. Publish a job or import your current openings to start collecting candidates.
            </p>
          ) : (
            <ul className="wa-space-y-3">
              {recentApplications.map((app) => (
                <li
                  key={app.id}
                  className="wa-flex wa-items-center wa-justify-between wa-rounded-xl wa-bg-m3-surface-container wa-px-4 wa-py-3"
                >
                  <div className="wa-text-sm">
                    <span className="wa-font-semibold wa-text-m3-on-surface">{app.student.fullName}</span>
                    <span className="wa-text-m3-on-surface-variant"> applied to </span>
                    <Link
                      href={`/employer/jobs/${app.jobId}`}
                      className="wa-font-medium wa-text-m3-primary hover:wa-underline"
                    >
                      {app.job.title}
                    </Link>
                  </div>
                  <span className="wa-text-xs wa-text-m3-on-surface-variant wa-shrink-0 wa-ml-4">
                    {app.appliedAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side card: Placement Stats */}
        <div className="wa-col-span-12 lg:wa-col-span-4 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-4">
            Placement Snapshot
          </p>
          <ul className="wa-space-y-4">
            {placementStats.map(({ label, value, Icon }) => (
              <li key={label} className="wa-flex wa-items-start wa-gap-3">
                <div className="wa-rounded-lg wa-bg-m3-primary-container wa-p-2 wa-text-m3-on-primary-container">
                  <Icon size={16} aria-hidden />
                </div>
                <div>
                  <p className="wa-text-xl wa-font-bold wa-text-m3-on-surface">{value}</p>
                  <p className="wa-text-xs wa-text-m3-on-surface-variant">{label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom stats row */}
        {bottomStats.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="wa-col-span-6 lg:wa-col-span-3 wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-5 wa-flex wa-items-start wa-gap-3"
          >
            <div className="wa-rounded-lg wa-bg-m3-secondary-container wa-p-2 wa-text-m3-on-secondary-container">
              <Icon size={16} aria-hidden />
            </div>
            <div>
              <p className="wa-text-2xl wa-font-bold wa-text-m3-on-surface">{value}</p>
              <p className="wa-text-xs wa-text-m3-on-surface-variant">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Next move actions ── */}
      <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
        <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-1">
          Next move
        </p>
        <h2 className="wa-text-lg wa-font-bold wa-text-m3-on-surface wa-mb-4">
          Hire in three steps: create, review, place.
        </h2>
        <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-3">
          {[
            { href: '/employer/jobs/new', title: 'Create a posting', desc: 'Add a role, set pay and location, then submit for WorkforceAP review.' },
            { href: '/employer/jobs', title: 'Manage postings', desc: 'Edit drafts, track what is live, and close roles once filled.' },
            { href: '/employer/applications', title: 'Review applicants', desc: 'See recent submissions, respond quickly, and keep placements moving.' },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="wa-flex wa-items-center wa-justify-between wa-gap-3 wa-rounded-xl wa-bg-m3-surface-container wa-px-4 wa-py-4 wa-text-sm wa-transition-colors hover:wa-bg-m3-surface-container-high"
            >
              <span>
                <span className="wa-block wa-font-semibold wa-text-m3-on-surface">{title}</span>
                <span className="wa-block wa-text-xs wa-text-m3-on-surface-variant wa-mt-0.5">{desc}</span>
              </span>
              <ArrowRight size={16} className="wa-shrink-0 wa-text-m3-on-surface-variant" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
    </PortalEntryClient>
  );
}
