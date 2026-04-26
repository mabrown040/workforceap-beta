import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { EMPLOYER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { employerVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalCard from '@/components/portal/ui/PortalCard';
import {
  employerJobPostingApplicationStatusBadgeVariant,
  employerJobPostingApplicationStatusLabel,
} from '@/lib/employer/jobPostingApplicationStatus';

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

  const [totalMatches, interviewPipelineCount, hiredApplications, filledJobsCount, offerStageCount] = await Promise.all([
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
    prisma.jobPostingApplication.count({
      where: { job: { employerId: ctx.employerId }, status: 'offered' },
    }),
  ]);

  const hiresFromApplications = hiredApplications.length;
  const hiresTotal = hiresFromApplications + filledJobsCount;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const applicationsLast30d = await prisma.jobPostingApplication.count({
    where: { job: { employerId: ctx.employerId }, appliedAt: { gte: thirtyDaysAgo } },
  });

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
    {
      label: 'Total Candidates',
      value: totalApplications.toString(),
      trend: applicationsLast30d > 0 ? `${applicationsLast30d} in last 30d` : 'No recent applicants',
      trendColor: 'var(--color-on-surface-variant)',
      borderAccent: true,
    },
    {
      label: 'Active Tracks',
      value: activeJobs.toString(),
      trend: inReview > 0 ? `${inReview} awaiting go-live` : 'All live or closed',
      trendColor: 'var(--color-on-surface-variant)',
    },
    {
      label: 'Verified Hires',
      value: hiresTotal.toString(),
      trend: offerStageCount > 0 ? `${offerStageCount} offer${offerStageCount === 1 ? '' : 's'} out` : 'No open offers',
      trendColor: 'var(--color-on-surface-variant)',
    },
    {
      label: 'Avg. Time to Hire',
      value: avgMatchToHireDays === null ? '\u2014' : `${avgMatchToHireDays}d`,
      trend:
        avgMatchToHireDays !== null
          ? `Match → hire (when tracked)`
          : 'Add hires to see timing',
      trendColor: 'var(--color-on-surface-variant)',
    },
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
    <PortalPageFrame>
      {/* ── Mobile Employer Dashboard (≤640px) ── */}
      <div className="wa-block wa-md:wa-hidden portal-mobile-content">
        {/* Hero */}
        <div style={{ padding: '1.5rem 1.25rem 0.75rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent)', marginBottom: '0.35rem' }}>
            Employer Portal
          </p>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--color-on-surface)', lineHeight: 1.15, margin: 0 }}>
            {totalApplications > 0 ? `${totalApplications} candidate${totalApplications !== 1 ? 's' : ''} in pipeline` : 'Your talent pipeline'}
          </h2>
        </div>

        {/* Metric strip */}
        <div className="portal-card-scroll-row" style={{ padding: '0 1.25rem 0.5rem' }}>
          {[
            { label: 'Open Roles', value: activeJobs, icon: 'work', accent: 'accent' as const },
            { label: 'Candidates', value: totalApplications, icon: 'groups', accent: 'neutral' as const },
            { label: 'In Review', value: inReview, icon: 'pending', accent: 'neutral' as const },
            { label: 'Hired', value: hiresTotal, icon: 'person_check', accent: 'green' as const },
          ].map((s) => (
            <div key={s.label} className="portal-metric-card" style={{ minWidth: '120px', flexShrink: 0 }}>
              <div className={`portal-metric-card__icon-wrap portal-metric-card__icon-wrap--${s.accent}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              </div>
              <p className="portal-metric-card__value" style={{ fontSize: '1.5rem' }}>{s.value}</p>
              <p className="portal-metric-card__label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pipeline funnel card */}
        <div style={{ margin: '0.75rem 1.25rem 0', padding: '1rem', borderRadius: '0.875rem', background: 'var(--surface-container-low)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>Pipeline Funnel</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {[
              { label: 'Screened', value: Math.max(0, totalApplications - inReview) },
              { label: 'Interview', value: inReview },
              { label: 'Offer', value: offerStageCount },
              { label: 'Hired', value: filledPositions },
            ].map((s, i, arr) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>{s.label}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)', letterSpacing: '-0.03em', margin: 0 }}>{s.value}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', opacity: 0.3 }}>chevron_right</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginLeft: '1.5rem', marginRight: '1.5rem', marginTop: '1rem' }}>
          <VoiceAgentSurface {...employerVoiceSurface}>
            <PortalVoiceSession
              sessionEndpoint="/api/employer/voice-session"
              title="Employer voice assistant"
              description="Ask about posting roles, reviewing applicants, or navigating the employer portal."
              accent="#4f46e5"
              accentDark="#4338ca"
              speakingLabel="Assistant is speaking…"
              listeningLabel="Listening — ask your question"
            />
          </VoiceAgentSurface>
        </div>
        {/* Quick actions */}
        <div style={{ margin: '1rem 1.25rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {totalApplications > 0 ? (
            <Link href="/employer/applications"
              style={{ gridColumn: 'span 2', padding: '1rem 1.25rem', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', boxShadow: '0 4px 16px rgba(173,44,77,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#fff', fontVariationSettings: "'FILL' 1" }}>grading</span>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
                  Review {totalApplications} Candidate{totalApplications !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.7)' }}>arrow_forward</span>
            </Link>
          ) : (
            <Link href="/employer/jobs/new"
              style={{ gridColumn: 'span 2', padding: '1rem 1.25rem', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', boxShadow: '0 4px 16px rgba(173,44,77,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#fff', fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>Post Your First Role</span>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.7)' }}>arrow_forward</span>
            </Link>
          )}
          {([
            { href: '/employer/jobs/new', icon: 'add_circle', label: 'Post a Role', iconColor: 'var(--color-accent)' },
            { href: '/employer/messages', icon: 'forum', label: 'Messages', iconColor: 'var(--color-gold)' },
            { href: '/employer/jobs', icon: 'work', label: 'My Jobs', iconColor: 'var(--color-blue, #2b7bb9)' },
            { href: '/employer/pipeline', icon: 'account_tree', label: 'Pipeline', iconColor: 'var(--color-green, #4a9b4f)' },
          ] as const).map((a) => (
            <Link key={a.href} href={a.href} className="portal-quick-grid-item">
              <div className="portal-quick-grid-item__icon" style={{ background: 'var(--surface-container-high)' }}>
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1.125rem', color: a.iconColor, fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
              </div>
              <span className="portal-quick-grid-item__label">{a.label}</span>
            </Link>
          ))}
        </div>
        {/* Recent applicants */}
        <div style={{ marginLeft:"1.5rem", marginRight:"1.5rem", marginTop:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"1rem" }}>
            <h3 className="wa-text-xl wa-font-bold wa-tracking-tight text-on-surface">Recent Applicants</h3>
            <Link
              href="/employer/applications"
              className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest"
              style={{ textDecoration:"none", color: 'var(--color-accent)' }}
            >
              View All
            </Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {recentApplications.length === 0 ? (
              <PortalEmptyState
                title="No applications yet"
                description="Post a role to start receiving candidates from the WorkforceAP talent pool."
                icon={<span className="material-symbols-outlined">inbox</span>}
                primaryAction={{ label: 'Post a job', href: '/employer/jobs/new' }}
              />
            ) : (
              recentApplications.slice(0, 5).map((app) => (
                <Link key={app.id} href={`/employer/jobs/${app.jobId}`}
                  className="active:scale-[0.98] wa-transition-all"
                  style={{ textDecoration:"none" }}
                >
                  <PortalCard>
                  <div className="bg-surface-container-high" style={{ width:"2.5rem", height:"2.5rem", borderRadius:"9999px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span className="material-symbols-outlined wa-text-[18px] text-on-surface-variant">person</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <h4 className="wa-font-bold text-on-surface wa-text-sm wa-truncate">{app.student.fullName}</h4>
                      <span className="wa-text-[11px] text-on-surface-variant/60 wa-font-medium" style={{ marginLeft:"0.5rem", flexShrink:0 }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      className="wa-text-xs wa-font-semibold wa-uppercase wa-tracking-wider wa-truncate"
                      style={{ marginBottom:"0.25rem", color: 'var(--color-gold)' }}
                    >
                      {app.job.title}
                    </p>
                    <StatusBadge
                      label={employerJobPostingApplicationStatusLabel(app.status)}
                      variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                    />
                  </div>
                  </PortalCard>
                </Link>
              ))
            )}
          </div>
        </div>
        <MobileBottomNav variant="employer" />
      </div>
      {/* ── Desktop View ── */}
      <div className="wa-hidden wa-md:wa-block">
      {/* ── Header ── */}
      <PageHeader
        title="Employer overview"
        subtitle="Manage job postings, review applicants, and track your hiring pipeline."
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/employer/jobs/import" className="btn btn-outline">Import Jobs</Link>
            <Link href="/employer/jobs/new" data-tour="tour-post-job" className="btn btn-primary">Post a Job</Link>
          </div>
        }
      />

      <section style={{ marginBottom: '2rem' }}>
        <VoiceAgentSurface {...employerVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/employer/voice-session"
            title="Employer voice assistant"
            description="Ask about posting roles, reviewing applicants, or navigating this portal."
            accent="#4f46e5"
            accentDark="#4338ca"
            speakingLabel="Assistant is speaking…"
            listeningLabel="Listening — ask your question"
          />
        </VoiceAgentSurface>
      </section>

      {/* ── Empty State (shown first for cold-start clarity) ── */}
      {jobs.length === 0 && (
        <section className="portal-section--lg">
          <PortalEmptyState
            title="Welcome — start with your first posting"
            description="You do not have any job drafts or live roles yet. Post a single role, or import a list from a spreadsheet or careers URL."
            icon={<span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-on-surface-variant)' }}>work</span>}
            primaryAction={{ label: 'Post your first job', href: '/employer/jobs/new' }}
            secondaryAction={{ label: 'Import jobs', href: '/employer/jobs/import' }}
          />
        </section>
      )}

      {/* ── KPI Metric Strip ── */}
      <section className="portal-metric-strip" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Total Candidates', value: totalApplications, hint: applicationsLast30d > 0 ? `${applicationsLast30d} last 30d` : 'No recent', icon: 'groups', accent: 'accent' as const },
          { label: 'Active Roles', value: activeJobs, hint: inReview > 0 ? `${inReview} awaiting go-live` : 'All live or closed', icon: 'work', accent: 'blue' as const },
          { label: 'Verified Hires', value: hiresTotal, hint: offerStageCount > 0 ? `${offerStageCount} offer${offerStageCount === 1 ? '' : 's'} out` : 'No open offers', icon: 'person_check', accent: 'green' as const },
          { label: 'Avg. Time to Hire', value: avgMatchToHireDays === null ? '—' : `${avgMatchToHireDays}d`, hint: avgMatchToHireDays !== null ? 'Match → hire' : 'Add hires to see', icon: 'timer', accent: 'gold' as const },
        ].map((card) => (
          <div key={card.label} className="portal-metric-card">
            <div className={`portal-metric-card__icon-wrap portal-metric-card__icon-wrap--${card.accent}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
            </div>
            <p className="portal-metric-card__value">{card.value}</p>
            <p className="portal-metric-card__label">{card.label}</p>
            <p className="portal-metric-card__hint">{card.hint}</p>
          </div>
        ))}
      </section>

      {/* ── Talent Pipeline + Sidebar ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Pipeline */}
        <div className="portal-card portal-card--flat portal-card--padded-lg">
          <div className="portal-section-header" style={{ marginBottom: '1.5rem' }}>
            <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Talent Pipeline</h2>
            <Link href="/employer/jobs" className="portal-section-action">
              All postings
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>arrow_forward</span>
            </Link>
          </div>

          {/* Placement snapshot — icon mini-cards */}
          <div className="portal-grid-metrics" style={{ marginBottom: '1.75rem' }}>
            {placementCards.map((card) => (
              <div key={card.label} className="portal-metric-card">
                <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                </div>
                <p className="portal-metric-card__value" style={{ fontSize: '1.5rem' }}>{card.value}</p>
                <p className="portal-metric-card__label" style={{ fontSize: '0.6rem' }}>{card.label}</p>
              </div>
            ))}
          </div>

          {/* Action links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { label: 'Create a posting', desc: 'Add a role, set pay and location, submit for review.', href: '/employer/jobs/new', icon: 'add_circle' },
              { label: 'Manage postings', desc: 'Edit drafts, track what is live, close filled roles.', href: '/employer/jobs', icon: 'work' },
              { label: 'Review applicants', desc: 'See recent submissions, respond, keep placements moving.', href: '/employer/applications', icon: 'grading' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="portal-quick-action-item">
                <div className="portal-quick-action-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="portal-quick-action-item__label">{item.label}</p>
                  <p className="portal-quick-action-item__desc">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pipeline summary sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="portal-card portal-card--flat portal-card--padded portal-card--gradient-accent">
            <h3 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
              Pipeline Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: 'verified', label: 'Active Postings', value: activeJobs, iconColor: '#4ade80' },
                { icon: 'history_edu', label: 'In Review', value: inReview, iconColor: 'var(--color-gold)' },
                { icon: 'gavel', label: 'Filled / Closed', value: filledPositions, iconColor: 'var(--color-on-surface-variant)' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: item.iconColor, fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.1rem 0 0' }}>{item.value} total</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/employer/jobs" className="btn btn-outline" style={{ display: 'block', width: '100%', marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
              Manage Postings
            </Link>
          </div>

          <div className="portal-card portal-card--flat" style={{ background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', padding: '1.5rem', overflow: 'hidden', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-1rem', right: '-1rem', fontSize: '6rem', opacity: 0.08, color: '#fff' }}>school</span>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Workforce Advancement</h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Access credentialed graduates from our training programs.
              </p>
              <Link href="/employer/jobs/new" style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.9)', color: 'var(--color-accent)', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>
                Post a Job
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent Applicants ── */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="portal-section-header">
          <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Latest Applicants</h2>
          <Link href="/employer/applications" className="portal-section-action">
            View all
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>arrow_forward</span>
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="portal-card portal-card--flat portal-card--padded-lg" style={{ textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', display: 'block' }}>inbox</span>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
              No applications yet. Publish a job or import your current openings to start collecting candidates.
            </p>
            <Link href="/employer/jobs/new" className="btn btn-primary" style={{ display: 'inline-flex' }}>Post your first job</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {recentApplications.map((app) => (
              <Link key={app.id} href={`/employer/jobs/${app.jobId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="portal-activity-item" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>
                      {(app.student.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>{app.student.fullName}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600, margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.job.title}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <StatusBadge
                      label={employerJobPostingApplicationStatusLabel(app.status)}
                      variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{app.appliedAt.toLocaleDateString()}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3 }}>chevron_right</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>{/* end desktop */}
    </PortalPageFrame>
    </PortalEntryClient>
  );
}
