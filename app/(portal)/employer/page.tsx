import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { Sparkles, Calendar, UserCheck, Timer, Briefcase, Users, Clock, CheckCircle } from 'lucide-react';
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

  const stats = [
    { label: 'Active Postings', value: activeJobs, Icon: Briefcase },
    { label: 'Total Applications', value: totalApplications, Icon: Users },
    { label: 'In Review', value: inReview, Icon: Clock },
    { label: 'Filled/Closed', value: filledPositions, Icon: CheckCircle },
  ];

  const showEmployerOnboarding = employerRow.onboardingCompletedAt == null;
  const showEmployerTour =
    employerRow.onboardingCompletedAt != null && employerRow.tourCompletedAt == null;
  const superAdmin = await isSuperAdmin(user.id);

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
      <div className="space-y-10 text-on-surface antialiased">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Welcome back.</h1>
            <p className="text-on-surface-variant leading-relaxed max-w-xl text-lg font-medium opacity-80">
              Manage your postings and match with certified local talent.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/employer/jobs/import" className="bg-zinc-100 text-zinc-900 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:bg-zinc-200 text-sm">
              <span className="material-symbols-outlined text-[20px]">upload</span>
              Import Jobs
            </Link>
            <Link href="/employer/jobs/new" className="bg-rose-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all text-sm flex items-center gap-2" data-tour="tour-post-job">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Create New Posting
            </Link>
          </div>
        </section>

        {jobs.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-8 text-center border border-zinc-200/50">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">work_outline</span>
            <h3 className="text-2xl font-bold mb-2">Ready to find talent?</h3>
            <p className="text-on-surface-variant max-w-md mx-auto mb-6">
              You do not have any job drafts or live roles yet. Post a single role, or import a list from a spreadsheet or careers URL.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/employer/jobs/new" className="bg-rose-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all text-sm">
                Post your first job
              </Link>
            </div>
          </div>
        ) : null}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main Stats / Operations */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-container-low rounded-xl p-8 relative border border-zinc-200/50 h-full flex flex-col justify-between">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold tracking-tight">Hiring Pipeline</h3>
                <Link href="/employer/work-queue" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                  View Queue
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map(({ label, value, Icon }) => (
                  <div key={label} className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm flex flex-col items-center text-center">
                    <Icon size={24} className="text-rose-800 mb-3" />
                    <span className="text-3xl font-black text-zinc-900 mb-1">{value}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl p-8 border border-zinc-200 shadow-sm h-full flex flex-col">
              <h3 className="text-xl font-bold tracking-tight mb-6">Next moves</h3>
              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <Link href="/employer/jobs" className="p-4 bg-zinc-50 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-sm group-hover:text-rose-900">Manage Postings</h4>
                    <p className="text-[11px] text-zinc-500 font-medium mt-1">Edit drafts & track live roles</p>
                  </div>
                  <span className="material-symbols-outlined text-zinc-400 group-hover:text-rose-800">arrow_forward</span>
                </Link>

                <Link href="/employer/applications" className="p-4 bg-zinc-50 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-sm group-hover:text-rose-900">Review Applicants</h4>
                    <p className="text-[11px] text-zinc-500 font-medium mt-1">Respond to recent submissions</p>
                  </div>
                  <span className="material-symbols-outlined text-zinc-400 group-hover:text-rose-800">arrow_forward</span>
                </Link>

                <Link href="/employer/pipeline" className="p-4 bg-zinc-50 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-sm group-hover:text-rose-900">Candidate Pipeline</h4>
                    <p className="text-[11px] text-zinc-500 font-medium mt-1">Track interview progression</p>
                  </div>
                  <span className="material-symbols-outlined text-zinc-400 group-hover:text-rose-800">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12">
            <div className="bg-surface-container-low rounded-xl p-8 relative border border-zinc-200/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold tracking-tight">Recent Applications</h3>
                <Link href="/employer/applications" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                  View All
                </Link>
              </div>
              {recentApplications.length === 0 ? (
                <p className="text-on-surface-variant max-w-md mb-6">
                  No applications yet. Publish a job or import your current openings to start collecting candidates.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="p-4 bg-white rounded-lg hover:bg-rose-50 transition-colors cursor-pointer group border border-zinc-200">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm group-hover:text-rose-900">{app.student.fullName}</h4>
                        <span className="text-[10px] text-zinc-500 font-medium">{app.appliedAt.toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium">Applied to: <Link href={`/employer/jobs/${app.jobId}`} className="text-primary hover:underline">{app.job.title}</Link></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </PortalEntryClient>
  );
}
