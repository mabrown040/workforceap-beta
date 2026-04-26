import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { loadMemberCareerBriefBundleSafe } from '@/lib/content/careerBriefPersonalization';
import { buildScoreBreakdownFromRelations } from '@/lib/readiness/score';
import { fetchCareerBriefRelations } from '@/lib/content/careerBriefPersonalization';
import { getProgramBySlug } from '@/lib/content/programs';
import { parseProgramSalaryRange, salaryRangeDisplay } from '@/lib/content/programSalaryOutcomes';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Brief',
  description: 'Your personalized career intelligence — salary benchmarks, job market signals, and action items.',
  path: '/dashboard/career-brief',
});

// Program-category → career tips mapping
const PROGRAM_TIPS: Record<string, { tips: string[]; topRoles: string[]; avgRampMonths: number }> = {
  'it-cyber': {
    tips: [
      'Update your LinkedIn headline with your certifications (CompTIA A+, Security+, etc.)',
      'Create a simple home lab — even a Raspberry Pi shows practical experience',
      'Apply to managed service providers (MSPs) — they hire fast and train on the job',
    ],
    topRoles: ['Help Desk Technician', 'IT Support Specialist', 'Cybersecurity Analyst'],
    avgRampMonths: 3,
  },
  'ai-software': {
    tips: [
      'Push at least one project to GitHub — recruiters check your commit history',
      'Add "AI Professional" to your LinkedIn title even while training',
      'IBM badge holders get fast-tracked at many enterprise partners — claim yours',
    ],
    topRoles: ['AI Developer', 'Software Engineer', 'Data Analyst'],
    avgRampMonths: 4,
  },
  'cloud-data': {
    tips: [
      'AWS/Google certs expire — check your renewal timeline now',
      'Data analyst roles are one of the fastest-growing categories in Texas right now',
      'SQL practice on real public datasets (Kaggle) separates you from 90% of applicants',
    ],
    topRoles: ['Cloud Engineer', 'Data Analyst', 'Business Intelligence Developer'],
    avgRampMonths: 5,
  },
  healthcare: {
    tips: [
      'Medical billing roles often allow remote work after 90 days — ask during interviews',
      'Bilingual candidates earn 8–12% more in healthcare admin roles in Texas',
      'HIPAA certification is free online and always worth mentioning',
    ],
    topRoles: ['Medical Coder', 'Healthcare Administrator', 'Medical Billing Specialist'],
    avgRampMonths: 3,
  },
  manufacturing: {
    tips: [
      'CPT/CLT certifications qualify you for apprenticeships with union pay scales',
      'Many Austin-area manufacturers offer direct-hire after 60-day temp placement',
      'Forklift certification takes 1 day and opens hundreds of roles',
    ],
    topRoles: ['Logistics Coordinator', 'Production Technician', 'Supply Chain Associate'],
    avgRampMonths: 2,
  },
  business: {
    tips: [
      'Google Project Management cert holders often stand out for PM roles',
      'Salesforce admin roles are in high demand — even basic admin skills command $60K+',
      'If you have an MBA, your MBA + tech cert combination is rare — lead with both on applications',
    ],
    topRoles: ['Project Manager', 'Operations Analyst', 'Business Development Rep'],
    avgRampMonths: 4,
  },
  'digital-literacy': {
    tips: [
      'Digital literacy opens admin and coordinator roles across every industry',
      'Microsoft Office certification (free via LinkedIn Learning) adds credibility to your application',
      'Entry-level roles often offer the fastest path to internal promotions',
    ],
    topRoles: ['Administrative Coordinator', 'Office Assistant', 'Data Entry Specialist'],
    avgRampMonths: 1,
  },
};

function getCategoryTips(programSlug: string | null) {
  const program = programSlug ? getProgramBySlug(programSlug) : null;
  const category = program?.category ?? 'digital-literacy';
  return PROGRAM_TIPS[category] ?? PROGRAM_TIPS['digital-literacy'];
}

// Market signals — curated weekly intel by program category
const MARKET_SIGNALS: Record<string, { headline: string; detail: string; icon: string }[]> = {
  'it-cyber': [
    { headline: '47K+ IT Support openings in Texas', detail: 'Highest volume in Dallas-Fort Worth and Austin metro areas. Entry roles filling in 2–3 weeks.', icon: 'trending_up' },
    { headline: 'Cybersecurity salaries up 11% YoY', detail: 'CompTIA Security+ holders averaging $72K entry. Demand driven by healthcare and finance sectors.', icon: 'security' },
  ],
  'ai-software': [
    { headline: 'AI Engineer demand up 34% nationally', detail: 'Python + ML skills dominate. IBM certification holders tracked to $85–110K starting range.', icon: 'auto_awesome' },
    { headline: 'Remote AI roles outnumber on-site 3:1', detail: 'Most AI/ML positions allow full remote after 30-day onboarding. Major advantage for Texas talent.', icon: 'home_work' },
  ],
  'cloud-data': [
    { headline: 'AWS/GCP roles: fastest time-to-hire in tech', detail: 'Certified cloud practitioners seeing offers in under 3 weeks. Austin hiring volume up 22%.', icon: 'cloud' },
    { headline: 'Data analyst median salary: $68K entry', detail: 'SQL + Tableau skills command premium. Financial services hiring most aggressively.', icon: 'analytics' },
  ],
  healthcare: [
    { headline: 'Medical coding shortage: 29K unfilled roles', detail: 'Texas leads nationally. AAPC-certified coders placed within 6 weeks on average.', icon: 'medical_services' },
    { headline: 'Healthcare admin salary: $47–58K entry', detail: 'Remote billing roles increased 40% since 2023. Hospital networks hiring directly from cert programs.', icon: 'local_hospital' },
  ],
  manufacturing: [
    { headline: 'Austin logistics/trades up 18% YoY', detail: 'Tesla Gigafactory + semiconductor expansion driving trades demand. CPT holders fast-tracked.', icon: 'precision_manufacturing' },
    { headline: 'Union apprenticeships paying $28–34/hr', detail: 'CLT and trades certifications open apprenticeship pipelines paying well above minimum.', icon: 'handshake' },
  ],
  business: [
    { headline: 'PM roles: $72K average entry in Texas', detail: 'Google PM cert holders 2× more likely to receive callbacks. Remote options widely available.', icon: 'task_alt' },
    { headline: 'Salesforce ecosystem: 4.2M new jobs by 2026', detail: 'Even admin-level Salesforce skills command $60–75K. Texas orgs actively recruiting.', icon: 'salesforce' },
  ],
  'digital-literacy': [
    { headline: 'Admin coordinator demand stable at 85K+ openings', detail: 'Every industry needs digital-literate staff. Microsoft cert holders preferred.', icon: 'computer' },
    { headline: 'Fastest path to employment: 4–6 weeks post-cert', detail: 'Digital literacy grads often see shorter job search timelines than other tracks.', icon: 'speed' },
  ],
};

function getMarketSignals(programSlug: string | null) {
  const program = programSlug ? getProgramBySlug(programSlug) : null;
  const category = program?.category ?? 'digital-literacy';
  return MARKET_SIGNALS[category] ?? MARKET_SIGNALS['digital-literacy'];
}

export default async function CareerBriefPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-brief');

  // Single round-trip: fetchCareerBriefRelations loads all relations in one call.
  // assembleCareerBriefContext + buildScoreBreakdown reuse those rows — no duplicate queries.
  const rows = await fetchCareerBriefRelations(user.id);
  const { assembleCareerBriefContext } = await import('@/lib/content/careerBriefPersonalization');
  const breakdown = buildScoreBreakdownFromRelations(
    rows.user, rows.goals, rows.aiResults, rows.resourceProgress,
    rows.learningProgress, rows.pathwaySteps, rows.jobApps, rows.certs, rows.lastEvent
  );
  const context = assembleCareerBriefContext(rows.user, breakdown);

  // Prefer enrolledProgram, fall back to programInterest for pre-enrollment members
  const dbUser = rows.user;
  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  const programInterestSlug = dbUser?.applications?.[0]?.programInterest ?? null;
  const program = enrolledProgram
    ? getProgramBySlug(enrolledProgram)
    : programInterestSlug
      ? getProgramBySlug(programInterestSlug) ?? null
      : null;
  const programSlug = program?.slug ?? null;
  const salaryRange = program ? parseProgramSalaryRange(program.salary) : null;
  const salaryDisplay = program ? salaryRangeDisplay(program) : null;
  const tips = getCategoryTips(programSlug);
  const signals = getMarketSignals(programSlug);

  const readinessScore = Math.min(100, Object.values(breakdown).reduce((s, b) => s + b.earned, 0));

  // Build a rich action list combining readiness gaps + recommended actions
  const actionItems: Array<{ label: string; href: string; icon: string; priority: 'high' | 'medium' | 'low' }> = [];
  if (!breakdown.buildResume.done) actionItems.push({ label: 'Build or upload your resume', href: '/dashboard/ai-tools/resume-rewriter', icon: 'description', priority: 'high' });
  if (!breakdown.practiceInterview.done) actionItems.push({ label: 'Practice interview questions', href: '/dashboard/ai-tools/interview-practice', icon: 'record_voice_over', priority: 'high' });
  if (!breakdown.addApplications.done) actionItems.push({ label: 'Log 3+ job applications', href: '/dashboard/job-applications', icon: 'work', priority: 'high' });
  if (!breakdown.completePathwaySteps.done) actionItems.push({ label: 'Continue your training pathway', href: '/dashboard/training', icon: 'school', priority: 'medium' });
  if (!breakdown.trackCertifications.done) actionItems.push({ label: 'Add earned certifications', href: '/dashboard/certifications', icon: 'workspace_premium', priority: 'medium' });
  if (!breakdown.setGoals.done) actionItems.push({ label: 'Set your career goals', href: '/dashboard/ai-tools/skill-mapper', icon: 'flag', priority: 'low' });
  if (context.jobSearchUrl && breakdown.addApplications.done) {
    actionItems.push({ label: `Search ${context.programShortLabel ?? 'tech'} jobs in your area`, href: context.jobSearchUrl, icon: 'search', priority: 'medium' });
  }

  const highPriority = actionItems.filter(a => a.priority === 'high').slice(0, 3);
  const otherActions = actionItems.filter(a => a.priority !== 'high').slice(0, 3);

  const priorityColor: Record<string, string> = {
    high: 'var(--color-accent)',
    medium: 'var(--color-gold)',
    low: 'var(--color-on-surface-variant)',
  };

  return (
    <>
      <div style={{ paddingBottom: '5rem' }}>
        {/* Page header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent)', margin: '0 0 0.25rem' }}>
                {program ? program.title : 'Career Intelligence'}
              </p>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--color-on-surface)', margin: 0 }}>
                Career Brief
              </h1>
            </div>
            <Link href="/dashboard/weekly-recap" className="btn btn-outline btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>event_note</span>
              Weekly Recap
            </Link>
          </div>
        </div>

        {/* Readiness score + salary benchmark hero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
          {/* Readiness score */}
          <div className="portal-metric-card portal-card--gradient-accent" style={{ padding: '1.25rem' }}>
            <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>checklist</span>
            </div>
            <p className="portal-metric-card__value" style={{ color: readinessScore >= 70 ? 'var(--color-green, #4a9b4f)' : readinessScore >= 40 ? 'var(--color-gold)' : 'var(--color-accent)' }}>
              {readinessScore}<span style={{ fontSize: '1rem' }}>/100</span>
            </p>
            <p className="portal-metric-card__label">Readiness Score</p>
            <Link href="/dashboard/readiness" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', marginTop: '0.375rem', display: 'block' }}>
              View checklist →
            </Link>
          </div>

          {/* Salary benchmark */}
          {salaryDisplay && salaryRange && (
            <div className="portal-metric-card" style={{ padding: '1.25rem' }}>
              <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--green">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>payments</span>
              </div>
              <p className="portal-metric-card__value" style={{ fontSize: '1.375rem', color: 'var(--color-green, #4a9b4f)' }}>{salaryDisplay}</p>
              <p className="portal-metric-card__label">Target Salary Range</p>
              <p className="portal-metric-card__hint">{program?.title ?? 'Your program'} · national avg</p>
            </div>
          )}

          {/* Job search */}
          {context.jobSearchUrl && (
            <div className="portal-metric-card" style={{ padding: '1.25rem' }}>
              <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>search</span>
              </div>
              <p className="portal-metric-card__value" style={{ fontSize: '1.375rem' }}>Indeed</p>
              <p className="portal-metric-card__label">Live Job Search</p>
              <a href={context.jobSearchUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', marginTop: '0.375rem', display: 'block' }}>
                {context.location ? `Jobs in ${context.location} →` : 'Search now →'}
              </a>
            </div>
          )}

          {/* Applications count */}
          <div className="portal-metric-card" style={{ padding: '1.25rem' }}>
            <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>work</span>
            </div>
            <p className="portal-metric-card__value">{context.applicationsCount}</p>
            <p className="portal-metric-card__label">Applications Logged</p>
            <Link href="/dashboard/job-applications" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', marginTop: '0.375rem', display: 'block' }}>
              {context.applicationsCount === 0 ? 'Start tracking →' : 'View tracker →'}
            </Link>
          </div>
        </div>

        {/* Priority Actions */}
        {highPriority.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>priority_high</span>
              <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Priority This Week
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {highPriority.map((action) => (
                <Link key={action.href} href={action.href} className="portal-quick-action-item" style={{ textDecoration: 'none', border: '1px solid rgba(173,44,77,0.2)', background: 'rgba(173,44,77,0.04)' }}
                  target={action.href.startsWith('http') ? '_blank' : undefined}
                  rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <div className="portal-quick-action-item__icon" style={{ background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                  </div>
                  <span className="portal-quick-action-item__label" style={{ color: 'var(--color-on-surface)' }}>{action.label}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)', opacity: 0.6, flexShrink: 0 }}>chevron_right</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Market signals — live intel */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>insights</span>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Market Signals — {program?.categoryLabel ?? 'Your Sector'}
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {signals.map((sig) => (
              <div key={sig.headline} className="portal-card portal-card--flat" style={{ padding: '1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(173,44,77,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{sig.icon}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: '0 0 0.375rem', lineHeight: 1.3 }}>{sig.headline}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>{sig.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program-specific career tips */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Career Tips for {program?.categoryLabel ?? 'Your Path'}
            </h2>
          </div>
          <div className="portal-card portal-card--flat" style={{ padding: '1.125rem' }}>
            <div style={{ marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.375rem' }}>
                Top Roles in This Track
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {tips.topRoles.map((role) => (
                  <span key={role} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.08)', color: 'var(--color-accent)' }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {tips.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', padding: '0.1rem 0.375rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.08)', flexShrink: 0, marginTop: '0.125rem' }}>
                    {i + 1}
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.55 }}>{tip}</p>
                </div>
              ))}
            </div>
            {tips.avgRampMonths > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: 'var(--color-on-surface)' }}>Average time to first offer</strong> after certification: ~{tips.avgRampMonths} months of active searching
              </p>
            )}
          </div>
        </div>

        {/* More actions */}
        {otherActions.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', fontVariationSettings: "'FILL' 1" }}>checklist</span>
              <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                Also Worth Doing
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {otherActions.map((action) => (
                <Link key={action.href} href={action.href} className="portal-quick-action-item" style={{ textDecoration: 'none' }}
                  target={action.href.startsWith('http') ? '_blank' : undefined}
                  rel={action.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <div className="portal-quick-action-item__icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: priorityColor[action.priority], fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                  </div>
                  <span className="portal-quick-action-item__label">{action.label}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tools quick access */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>build</span>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Career Toolkit
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { label: 'Job Search Tools', href: '/dashboard/ai-tools', icon: 'auto_awesome' },
              { label: 'Skill Mapper', href: '/dashboard/ai-tools/skill-mapper', icon: 'radar' },
              { label: 'Salary Guide', href: '/salary-guide', icon: 'payments' },
              { label: 'Interest Profiler', href: '/dashboard/learning/interest-profiler', icon: 'quiz' },
              { label: 'WIOA Screening', href: '/dashboard/learning/wioa-qualification', icon: 'policy' },
              { label: 'Job Readiness', href: '/dashboard/readiness', icon: 'checklist' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="portal-quick-action-item"
                style={{ textDecoration: 'none', flex: '0 0 auto', padding: '0.5rem 0.875rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{link.icon}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
