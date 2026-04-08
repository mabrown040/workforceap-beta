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
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Hero */}
        <div style={{ paddingLeft:"1.5rem", paddingRight:"1.5rem", paddingTop:"1.5rem", paddingBottom:"0.5rem" }}>
          <p className="wa-text-[11px] wa-uppercase wa-tracking-[0.12em] wa-font-semibold wa-text-[#8c0f37]" style={{ marginBottom:"0.25rem" }}>Employer Portal</p>
          <h2 className="wa-text-2xl wa-font-extrabold wa-tracking-tight text-on-surface wa-leading-tight">
            {totalApplications > 0 ? `${totalApplications} candidate${totalApplications !== 1 ? 's' : ''} waiting` : 'Your talent pipeline'}
          </h2>
        </div>
        <div style={{ marginLeft: '1.5rem', marginRight: '1.5rem', marginBottom: '1rem' }}>
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
        {/* Stats row - horizontal scroll */}
        <div style={{ display:"flex", gap:"0.75rem", overflowX:"auto", scrollbarWidth:"none", paddingLeft:"1.5rem", paddingRight:"1.5rem", paddingBottom:"0.5rem" }}>
          {[
            { label: 'Open Roles', value: activeJobs, color: 'var(--color-accent)' },
            { label: 'Candidates', value: totalApplications, color: 'var(--on-surface)' },
            { label: 'In Review', value: inReview, color: 'var(--secondary)' },
          ].map((s) => (
            <div key={s.label} className="wa-bg-white" style={{ minWidth:"130px", flex:1, padding:"1rem", borderRadius:"0.75rem", boxShadow:"0 1px 2px rgba(0,0,0,0.05)" }}>
              <p className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-wider text-on-surface-variant/60" style={{ marginBottom:"0.25rem" }}>{s.label}</p>
              <p className="wa-text-2xl wa-font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Pipeline summary strip */}
        <div className="bg-surface-container-low" style={{ marginLeft:"1.5rem", marginRight:"1.5rem", marginTop:"0.75rem", padding:"1rem", borderRadius:"0.75rem", display:"flex", justifyContent:"space-between", alignItems:"center", textAlign:"center" }}>
          {[
            { label: 'Screened', value: Math.max(0, totalApplications - inReview) },
            { label: 'Interview', value: inReview },
            { label: 'Offer', value: offerStageCount },
            { label: 'Hired', value: filledPositions },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <div style={{ flex:1, textAlign:"center" }}>
                <p className="wa-text-[11px] wa-font-bold text-on-surface-variant/50 wa-uppercase wa-tracking-tighter">{s.label}</p>
                <p className="wa-text-sm wa-font-bold text-on-surface">{s.value}</p>
              </div>
              {i < arr.length - 1 && <div className="bg-outline-variant/30" style={{ width: '1px', height:"1.25rem" }} />}
            </div>
          ))}
        </div>
        {/* Quick actions — Review Apps is primary when candidates exist */}
        <div style={{ marginLeft:"1.5rem", marginRight:"1.5rem", marginTop:"1rem", display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"0.75rem" }}>
          {totalApplications > 0 ? (
            <Link href="/employer/applications"
              className="wa-text-white active:scale-[0.98] wa-transition-all" style={{gridColumn:"span 2", padding:"1rem", borderRadius:"0.75rem", display:"flex", alignItems:"center", justifyContent:"space-between", textDecoration:"none", background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))'}}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                <span className="material-symbols-outlined" aria-hidden="true">grading</span>
                <span className="wa-font-bold wa-tracking-tight">Review {totalApplications} Candidate{totalApplications !== 1 ? 's' : ''}</span>
              </div>
              <span className="material-symbols-outlined" style={{ opacity:0.6 }} aria-hidden="true">arrow_forward</span>
            </Link>
          ) : (
            <Link href="/employer/jobs/new"
              className="wa-text-white active:scale-[0.98] wa-transition-all" style={{gridColumn:"span 2", padding:"1rem", borderRadius:"0.75rem", display:"flex", alignItems:"center", justifyContent:"space-between", textDecoration:"none", background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent))'}}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
                <span className="wa-font-bold wa-tracking-tight">Post Your First Role</span>
              </div>
              <span className="material-symbols-outlined" style={{ opacity:0.6 }} aria-hidden="true">arrow_forward</span>
            </Link>
          )}
          <Link href="/employer/jobs/new"
            className="bg-surface-container-high text-on-surface active:scale-[0.98] wa-transition-all" style={{ padding:"1rem", borderRadius:"0.75rem", display:"flex", flexDirection:"column", gap:"0.5rem", alignItems:"flex-start", textDecoration:"none", minHeight:"44px" }}>
            <span className="material-symbols-outlined wa-text-[#8c0f37]" aria-hidden="true">add_circle</span>
            <span className="wa-text-sm wa-font-bold wa-leading-tight">Post a Role</span>
          </Link>
          <Link href="/employer/messages"
            className="bg-surface-container-high text-on-surface active:scale-[0.98] wa-transition-all" style={{ padding:"1rem", borderRadius:"0.75rem", display:"flex", flexDirection:"column", gap:"0.5rem", alignItems:"flex-start", textDecoration:"none", minHeight:"44px" }}>
            <span className="material-symbols-outlined wa-text-[#7b5800]" aria-hidden="true">forum</span>
            <span className="wa-text-sm wa-font-bold wa-leading-tight">Messages</span>
          </Link>
        </div>
        {/* Recent applicants */}
        <div style={{ marginLeft:"1.5rem", marginRight:"1.5rem", marginTop:"1.5rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"1rem" }}>
            <h3 className="wa-text-xl wa-font-bold wa-tracking-tight text-on-surface">Recent Applicants</h3>
            <Link href="/employer/applications" className="wa-text-xs wa-font-bold wa-text-[#8c0f37] wa-uppercase wa-tracking-widest" style={{ textDecoration:"none" }}>View All</Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
            {recentApplications.length === 0 ? (
              <PortalEmptyState
                title="No applications yet"
                description="Post a role to start receiving candidates from the WorkforceAP talent pool."
                icon={<span className="material-symbols-outlined" aria-hidden="true">inbox</span>}
                primaryAction={{ label: 'Post a job', href: '/employer/jobs/new' }}
              />
            ) : (
              recentApplications.slice(0, 5).map((app) => (
                <Link key={app.id} href={`/employer/jobs/${app.jobId}`}
                  className="wa-bg-white active:scale-[0.98] wa-transition-all" style={{ padding:"1rem", borderRadius:"0.75rem", display:"flex", alignItems:"center", gap:"0.75rem", textDecoration:"none" }}>
                  <div className="bg-surface-container-high" style={{ width:"2.5rem", height:"2.5rem", borderRadius:"9999px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span className="material-symbols-outlined wa-text-[18px] text-on-surface-variant" aria-hidden="true">person</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <h4 className="wa-font-bold text-on-surface wa-text-sm wa-truncate">{app.student.fullName}</h4>
                      <span className="wa-text-[11px] text-on-surface-variant/60 wa-font-medium" style={{ marginLeft:"0.5rem", flexShrink:0 }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="wa-text-xs wa-text-[#7b5800] wa-font-semibold wa-uppercase wa-tracking-wider wa-truncate" style={{ marginBottom:"0.25rem" }}>{app.job.title}</p>
                    <StatusBadge
                      label={employerJobPostingApplicationStatusLabel(app.status)}
                      variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                    />
                  </div>
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
            icon={<span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-on-surface-variant)' }} aria-hidden="true">work</span>}
            primaryAction={{ label: 'Post your first job', href: '/employer/jobs/new' }}
            secondaryAction={{ label: 'Import jobs', href: '/employer/jobs/import' }}
          />
        </section>
      )}

      {/* ── KPI Metric Cards ── */}
      <section className="portal-grid-metrics" style={{ marginBottom: '2rem' }}>
        {kpiCards.map((card) => (
          <div key={card.label} className={`metric-card${card.borderAccent ? ' metric-card--accent' : ''}`}>
            <p className="metric-label" style={{ marginBottom: '0.5rem' }}>{card.label}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span className="metric-value">{card.value}</span>
              {card.trend && <span style={{ fontSize: '0.75rem', fontWeight: 500, color: card.trendColor }}>{card.trend}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* ── Talent Pipeline + Verification Tools ── */}
      <section className="portal-grid-2col" style={{ marginBottom: '2rem' }}>
        {/* Pipeline */}
        <div className="stitch-card stitch-card--padded-lg">
          <div className="portal-section-header" style={{ marginBottom: '2rem' }}>
            <h2 className="portal-section-heading" style={{ margin: 0 }}>Talent Pipeline</h2>
            <span className="material-symbols-outlined" style={{ padding: '0.5rem', background: 'var(--surface-container-lowest)', borderRadius: '0.375rem', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }} aria-hidden="true">filter_list</span>
          </div>

          {/* Placement snapshot stats */}
          <div className="portal-grid-metrics" style={{ marginBottom: '2rem' }}>
            {placementCards.map((card) => (
              <div key={card.label} style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', display: 'block', marginBottom: '0.5rem' }} aria-hidden="true">{card.icon}</span>
                <p className="portal-stat-value" style={{ fontSize: '1.5rem' }}>{card.value}</p>
                <p className="portal-stat-label" style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
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
              <Link key={item.label} href={item.href} className="portal-action-row">
                <div>
                  <h4 className="portal-action-row__title">{item.label}</h4>
                  <p className="portal-action-row__desc">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4 }} aria-hidden="true">chevron_right</span>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(88,65,68,0.1)', textAlign: 'center' }}>
            <Link href="/employer/jobs" className="portal-section-action">
              View all job postings
            </Link>
          </div>
        </div>

        {/* Verification + Featured */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stitch-card stitch-card--padded">
            <h3 className="portal-section-title" style={{ marginBottom: '1.5rem' }}>
              Pipeline Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: 'verified', label: 'Active Postings', value: activeJobs, status: 'Live', color: '#80d99f' },
                { icon: 'history_edu', label: 'In Review', value: inReview, status: 'Pending', color: 'var(--color-on-surface-variant)' },
                { icon: 'gavel', label: 'Filled/Closed', value: filledPositions, status: 'Complete', color: 'var(--color-on-surface-variant)' },
              ].map((item) => (
                <div key={item.label} className="portal-pipeline-item">
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p className="portal-pipeline-item__label">{item.label}</p>
                    <p className="portal-pipeline-item__meta">{item.value} {item.status.toLowerCase()}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: item.color, fontSize: '1.25rem' }} aria-hidden="true">
                    {item.value > 0 ? 'check_circle' : 'pending'}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/employer/jobs" className="btn btn-outline" style={{
              display: 'block', width: '100%', marginTop: '1.5rem',
              textAlign: 'center', fontSize: '0.75rem',
            }}>
              Manage Postings
            </Link>
          </div>

          <div className="portal-promo-card">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 className="portal-promo-card__title">Workforce Advancement</h3>
              <p className="portal-promo-card__desc">
                Access credentialed graduates from our training programs.
              </p>
              <Link href="/employer/jobs/new" className="portal-promo-card__cta">
                Post a Job
              </Link>
            </div>
            <span className="material-symbols-outlined portal-promo-card__bg-icon" aria-hidden="true">school</span>
          </div>
        </div>
      </section>

      {/* ── Recent Activity ── */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="portal-section-header">
          <h2 className="portal-section-heading" style={{ margin: 0 }}>Latest Applicants</h2>
          <Link href="/employer/applications" className="portal-section-action">
            View all applications
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="stitch-card stitch-card--padded-lg" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
              No applications yet. Publish a job or import your current openings to start collecting candidates.
            </p>
          </div>
        ) : (
          <div className="portal-grid-3col">
            {recentApplications.map((app) => (
              <div key={app.id} className="stitch-card stitch-card--padded">
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{app.student.fullName}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 500, marginBottom: '0.75rem' }}>
                    Applied to {app.job.title}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {app.appliedAt.toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/employer/jobs/${app.jobId}`} className="btn btn-outline" style={{
                  display: 'block', width: '100%', textAlign: 'center',
                }}>
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>{/* end desktop */}
    </PortalPageFrame>
    </PortalEntryClient>
  );
}
