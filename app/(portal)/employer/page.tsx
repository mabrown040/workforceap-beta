import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { EMPLOYER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';

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

  const kpiCards = [
    { label: 'Total Candidates', value: totalApplications.toString(), trend: '+12%', trendColor: '#80d99f', borderAccent: true },
    { label: 'Active Tracks', value: activeJobs.toString(), trend: `${inReview} in review`, trendColor: 'var(--color-on-surface-variant)' },
    { label: 'Verified Hires', value: hiresTotal.toString(), trend: 'Compliance', trendColor: '#80d99f' },
    { label: 'Avg. Time to Hire', value: avgMatchToHireDays === null ? '\u2014' : `${avgMatchToHireDays}d`, trend: avgMatchToHireDays !== null ? `-${avgMatchToHireDays}d` : '', trendColor: '#80d99f' },
  ];

  const placementCards = [
    { label: 'Members matched to your roles', value: totalMatches, icon: 'auto_awesome' },
    { label: 'Interviews or later (pipeline)', value: interviewPipelineCount, icon: 'calendar_today' },
    { label: 'Hires (apps + filled roles)', value: hiresTotal, icon: 'person_check' },
    { label: 'Avg. days match to hire', value: avgMatchToHireDays === null ? '\u2014' : avgMatchToHireDays, icon: 'timer' },
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
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* ── Mobile Employer Dashboard (≤640px) ── */}
      <div className="block md:hidden pb-24">
        {/* Hero */}
        <div className="px-6 pt-6 pb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[#8c0f37] mb-1">Overview</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">
            Elite Talent<br/>at your fingertips.
          </h2>
        </div>
        {/* Stats row - horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto px-6 pb-2 hide-scrollbar">
          {[
            { label: 'Open Roles', value: activeJobs, color: '#8c0f37' },
            { label: 'Candidates', value: totalApplications, color: 'var(--on-surface)' },
            { label: 'In Review', value: inReview, color: 'var(--secondary)' },
          ].map((s) => (
            <div key={s.label} className="min-w-[130px] flex-1 bg-white p-4 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Pipeline summary strip */}
        <div className="mx-6 mt-3 bg-surface-container-low p-4 rounded-xl flex justify-between items-center text-center">
          {[
            { label: 'Screened', value: Math.max(0, totalApplications - inReview) },
            { label: 'Interview', value: inReview },
            { label: 'Offer', value: Math.floor(inReview / 2) },
            { label: 'Hired', value: filledPositions },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-tighter">{s.label}</p>
                <p className="text-sm font-bold text-on-surface">{s.value}</p>
              </div>
              {i < arr.length - 1 && <div className="w-px h-5 bg-outline-variant/30" />}
            </div>
          ))}
        </div>
        {/* Quick actions */}
        <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
          <Link href="/employer/jobs/new"
            className="col-span-2 p-4 rounded-xl flex items-center justify-between text-white no-underline active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)' }}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined">add_circle</span>
              <span className="font-bold tracking-tight">Post a Role</span>
            </div>
            <span className="material-symbols-outlined opacity-60">arrow_forward</span>
          </Link>
          <Link href="/employer/applications"
            className="bg-surface-container-high text-on-surface p-4 rounded-xl flex flex-col gap-2 items-start no-underline active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[#7b5800]">grading</span>
            <span className="text-sm font-bold leading-tight">Review Apps</span>
          </Link>
          <Link href="/employer/messages"
            className="bg-surface-container-high text-on-surface p-4 rounded-xl flex flex-col gap-2 items-start no-underline active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[#8c0f37]">forum</span>
            <span className="text-sm font-bold leading-tight">Messages</span>
          </Link>
        </div>
        {/* Recent applicants */}
        <div className="mx-6 mt-6">
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-xl font-bold tracking-tight text-on-surface">Recent Applicants</h3>
            <Link href="/employer/applications" className="text-xs font-bold text-[#8c0f37] uppercase tracking-widest no-underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentApplications.length === 0 ? (
              <div className="bg-white rounded-xl p-5 text-center">
                <p className="text-sm text-on-surface-variant">No applications yet. Post a role to get started.</p>
              </div>
            ) : (
              recentApplications.slice(0, 5).map((app) => (
                <Link key={app.id} href={`/employer/jobs/${app.jobId}`}
                  className="bg-white p-4 rounded-xl flex items-center gap-3 no-underline active:scale-[0.98] transition-all">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-on-surface text-sm truncate">{app.student.fullName}</h4>
                      <span className="text-[10px] text-on-surface-variant/60 font-medium ml-2 flex-shrink-0">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#7b5800] font-semibold uppercase tracking-wider mb-1 truncate">{app.job.title}</p>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter"
                      style={{
                        background: app.status === 'pending' ? '#fff1f2' : '#fef3c7',
                        color: app.status === 'pending' ? '#8c0f37' : '#7b5800',
                      }}>
                      {app.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        <MobileBottomNav variant="portal" />
      </div>
      {/* ── Desktop View ── */}
      <div className="hidden md:block">
      {/* ── Header ── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem' }}>
        <div>
          <h1 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
            Talent Intelligence
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem' }}>
            Strategic oversight of your cross-functional talent pipeline and credentialed candidate pools.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/employer/jobs/import" style={{
            padding: '0.625rem 1.25rem', background: 'var(--surface-container-high)',
            color: 'var(--color-accent)', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: 600, textDecoration: 'none',
          }}>
            Import Jobs
          </Link>
          <Link href="/employer/jobs/new" data-tour="tour-post-job" style={{
            padding: '0.625rem 1.5rem',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #670024 100%)',
            color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            Post a Job
          </Link>
        </div>
      </header>

      {/* ── KPI Metric Cards ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {kpiCards.map((card) => (
          <div key={card.label} className="metric-card" style={card.borderAccent ? { borderLeft: '4px solid var(--color-accent)' } : {}}>
            <p className="metric-label" style={{ marginBottom: '0.5rem' }}>{card.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="metric-value">{card.value}</span>
              {card.trend && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: card.trendColor }}>{card.trend}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ── Empty State ── */}
      {jobs.length === 0 && (
        <section className="stitch-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Welcome -- start with your first posting</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', maxWidth: '36rem', margin: '0 auto 1rem' }}>
            You do not have any job drafts or live roles yet. Post a single role, or import a list from a spreadsheet or careers URL.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/employer/jobs/new" style={{ padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              Post your first job
            </Link>
            <Link href="/employer/jobs/import" style={{ padding: '0.5rem 1.25rem', border: '1px solid var(--outline-variant)', color: 'var(--color-on-surface)', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              Import jobs
            </Link>
          </div>
        </section>
      )}

      {/* ── Talent Pipeline + Verification Tools ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Pipeline */}
        <div className="stitch-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>Talent Pipeline</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ padding: '0.5rem', background: 'var(--surface-container-lowest)', borderRadius: '0.375rem', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>filter_list</span>
            </div>
          </div>

          {/* Placement snapshot stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {placementCards.map((card) => (
              <div key={card.label} style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', display: 'block', marginBottom: '0.5rem' }}>{card.icon}</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.02em' }}>{card.value}</p>
                <p style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>{card.label}</p>
              </div>
            ))}
          </div>

          {/* Action links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'Create a posting', desc: 'Add a role, set pay and location, then submit for review.', href: '/employer/jobs/new' },
              { label: 'Manage postings', desc: 'Edit drafts, track what is live, and close roles once filled.', href: '/employer/jobs' },
              { label: 'Review applicants', desc: 'See recent submissions, respond quickly, and keep placements moving.', href: '/employer/applications' },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem',
                  transition: 'background-color 0.15s', cursor: 'pointer',
                }}>
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)', marginBottom: '0.125rem' }}>{item.label}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{item.desc}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4 }}>chevron_right</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(88,65,68,0.1)', textAlign: 'center' }}>
            <Link href="/employer/jobs" style={{ color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
              View all job postings
            </Link>
          </div>
        </div>

        {/* Verification + Featured */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stitch-card">
            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
              Pipeline Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: 'verified', label: 'Active Postings', value: activeJobs, status: 'Live', color: '#80d99f' },
                { icon: 'history_edu', label: 'In Review', value: inReview, status: 'Pending', color: 'var(--color-on-surface-variant)' },
                { icon: 'gavel', label: 'Filled/Closed', value: filledPositions, status: 'Complete', color: 'var(--color-on-surface-variant)' },
              ].map((item) => (
                <div key={item.label} style={{
                  background: 'var(--surface-container-lowest)', padding: '1rem', borderRadius: '0.5rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{item.label}</p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)' }}>{item.value} {item.status.toLowerCase()}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: item.color, fontSize: '1.25rem' }}>
                    {item.value > 0 ? 'check_circle' : 'pending'}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/employer/jobs" style={{
              display: 'block', width: '100%', marginTop: '1.5rem',
              padding: '0.5rem', textAlign: 'center',
              border: '1px solid var(--outline-variant)', borderRadius: '0.5rem',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface)',
              textDecoration: 'none',
            }}>
              Manage Postings
            </Link>
          </div>

          <div style={{
            background: 'var(--color-accent)', padding: '1.5rem', borderRadius: '0.75rem',
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Workforce Advancement</h3>
              <p style={{ fontSize: '0.75rem', marginBottom: '1rem', opacity: 0.9 }}>
                Access credentialed graduates from our training programs.
              </p>
              <Link href="/employer/jobs/new" style={{
                display: 'inline-block', padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.9)', color: 'var(--color-accent)',
                borderRadius: '0.5rem', fontSize: '0.625rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none',
              }}>
                Post a Job
              </Link>
            </div>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', bottom: '-1rem', right: '-1rem',
              fontSize: '6rem', opacity: 0.1, color: '#fff',
            }}>school</span>
          </div>
        </div>
      </section>

      {/* ── Recent Activity ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <p className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Recent activity</p>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Latest Applicants</h2>
          </div>
          <Link href="/employer/applications" style={{ color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(173,44,77,0.2)', paddingBottom: '0.125rem' }}>
            View all applications
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="stitch-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
              No applications yet. Publish a job or import your current openings to start collecting candidates.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {recentApplications.map((app) => (
              <div key={app.id} className="stitch-card" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{app.student.fullName}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 500, marginBottom: '0.75rem' }}>
                    Applied to {app.job.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {app.appliedAt.toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/employer/jobs/${app.jobId}`} style={{
                  display: 'block', width: '100%', padding: '0.625rem',
                  textAlign: 'center', background: 'var(--surface-container-highest)',
                  color: 'var(--color-on-surface)', fontSize: '0.875rem', fontWeight: 600,
                  borderRadius: '0.5rem', textDecoration: 'none',
                }}>
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>{/* end desktop */}
    </div>
    </PortalEntryClient>
  );
}
