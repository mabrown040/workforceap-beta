import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getScoreBreakdownSafe, getScoreBreakdownSafeResult } from '@/lib/readiness/score';
import PageHeader from '@/components/portal/PageHeader';
import ReadinessMemberClient from './ReadinessMemberClient';
import ReadinessMobileScoreCard from '@/components/portal/ReadinessMobileScoreCard';
import CompactReadinessCoach from '@/components/portal/CompactReadinessCoach';
import ReadinessCoachReturnButton from '@/components/portal/ReadinessCoachReturnButton';
import { getMemberReadinessSections } from '@/lib/readiness/memberReadinessSections';
import { MemberProgressKit } from '@/components/portal/kit/pages/member/MemberProgressKit';
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('readinessMetaTitle'),
    description: t('readinessMetaDesc'),
    path: '/dashboard/readiness',
  });
}

/**
 * Map the 10-item score breakdown into 4 mobile-friendly categories.
 */
function buildCategories(breakdown: Awaited<ReturnType<typeof getScoreBreakdownSafe>>) {
  const pct = (earned: number, max: number) => (max > 0 ? Math.round((earned / max) * 100) : 0);

  // Resume: buildResume (20) + completeProfile (5) = 25 max
  const resumeEarned = breakdown.buildResume.earned + breakdown.completeProfile.earned;
  const resumeMax = breakdown.buildResume.max + breakdown.completeProfile.max;

  // Certificates & Training: trackCertifications (5) + complete2Resources (10) + completePathwaySteps (15) + startPathway (5) = 35 max
  const certEarned = breakdown.trackCertifications.earned + breakdown.complete2Resources.earned + breakdown.completePathwaySteps.earned + breakdown.startPathway.earned;
  const certMax = breakdown.trackCertifications.max + breakdown.complete2Resources.max + breakdown.completePathwaySteps.max + breakdown.startPathway.max;

  // Interview Prep: practiceInterview (15) + addApplications (15) = 30 max
  const interviewEarned = breakdown.practiceInterview.earned + breakdown.addApplications.earned;
  const interviewMax = breakdown.practiceInterview.max + breakdown.addApplications.max;

  // Engagement: setGoals (10) + weeklyConsistency (5) = 15 max
  const engagementEarned = breakdown.setGoals.earned + breakdown.weeklyConsistency.earned;
  const engagementMax = breakdown.setGoals.max + breakdown.weeklyConsistency.max;

  return [
    { label: 'Resume & Profile', pct: pct(resumeEarned, resumeMax), icon: 'description', color: 'var(--color-blue, #3b82f6)' },
    { label: 'Training & Certs', pct: pct(certEarned, certMax), icon: 'workspace_premium', color: 'var(--color-accent)' },
    { label: 'Interview & Jobs', pct: pct(interviewEarned, interviewMax), icon: 'record_voice_over', color: 'var(--color-green, #22c55e)' },
    { label: 'Engagement', pct: pct(engagementEarned, engagementMax), icon: 'trending_up', color: 'var(--color-gold, #f59e0b)' },
  ];
}

function getPriorityAction(breakdown: Awaited<ReturnType<typeof getScoreBreakdownSafe>>) {
  // Find highest-impact incomplete item
  const priorities: { key: keyof typeof breakdown; label: string; href: string; weight: number }[] = [
    { key: 'buildResume', label: 'Build or upload your resume to boost your score.', href: '/dashboard/profile#resume', weight: 20 },
    { key: 'practiceInterview', label: 'Practice a mock interview to sharpen your skills.', href: '/dashboard/ai-tools/interview-practice', weight: 15 },
    { key: 'addApplications', label: 'Apply to at least 3 jobs to show employer readiness.', href: '/dashboard/jobs', weight: 15 },
    { key: 'completePathwaySteps', label: 'Complete more pathway steps in your training program.', href: '/dashboard', weight: 15 },
    { key: 'setGoals', label: 'Set career goals to stay on track.', href: '/dashboard/career-brief', weight: 10 },
    { key: 'complete2Resources', label: 'Complete 2+ learning resources.', href: '/dashboard/resources', weight: 10 },
    { key: 'completeProfile', label: 'Fill in your profile details for employer visibility.', href: '/dashboard/profile', weight: 5 },
    { key: 'trackCertifications', label: 'Add your certificates to showcase your skills.', href: '/dashboard/certifications', weight: 5 },
  ];

  for (const p of priorities) {
    if (!breakdown[p.key].done) {
      return { label: p.label, href: p.href };
    }
  }
  return null;
}

export default async function DashboardReadinessPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/readiness');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  const [scoreResult, checklistSections] = await Promise.all([
    getScoreBreakdownSafeResult(user.id),
    getMemberReadinessSections(user.id).catch((e) => {
      console.error('[dashboard/readiness] checklist load failed', e);
      return null;
    }),
  ]);
  const breakdown = scoreResult.breakdown;
  const readinessDataLoadFailed = scoreResult.loadFailed || checklistSections === null;
  const overallScore = Math.min(100, Object.values(breakdown).reduce((sum, b) => sum + b.earned, 0));
  const categories = buildCategories(breakdown);
  const priorityAction = getPriorityAction(breakdown);

  // ── v2 KIT is the DEFAULT for Career Readiness (real data); legacy view stays
  // reachable via ?ui=legacy. Runs AFTER the auth guard above and reuses the
  // score breakdown + derived categories already loaded — no extra queries.
  if (requestedUi !== 'legacy') {
    // "This week" stats aren't tracked on this route; surface the four real
    // readiness categories (the actual signal this page loads) as the stat
    // tiles instead of the kit's fabricated weekly counters.
    const KIT_STAT_COLORS = [
      'var(--wa-info)',
      'var(--wa-accent)',
      'var(--wa-success)',
      'var(--wa-gold)',
    ] as const;
    const weekStats = categories.map((cat, i) => ({
      value: `${cat.pct}%`,
      label: cat.label,
      color: KIT_STAT_COLORS[i] ?? 'var(--wa-accent)',
    }));

    // Milestones derived from the real categories: a category fully earned is
    // "done"; the first not-yet-complete one is "active"; the rest are "goal".
    // Mirrors the pathway milestone done/current/locked pattern.
    const firstIncomplete = categories.findIndex((cat) => cat.pct < 100);
    const milestones = categories.map((cat, i) => ({
      label: cat.label,
      when: cat.pct >= 100 ? 'Complete' : i === firstIncomplete ? 'In progress' : 'Goal',
      state:
        cat.pct >= 100
          ? ('done' as const)
          : i === firstIncomplete
            ? ('active' as const)
            : ('goal' as const),
    }));

    const readinessNote = priorityAction
      ? `Next: ${priorityAction.label}`
      : 'Every category is complete.';

    return (
      <>
        {readinessDataLoadFailed ? (
          <span hidden data-portal-error-state="member-readiness-load" />
        ) : null}
        <MemberProgressKit
          readinessScore={overallScore}
          readinessNote={readinessNote}
          weekStats={weekStats}
          milestones={milestones}
        />
      </>
    );
  }

  return (
    <>
      {readinessDataLoadFailed ? <span hidden data-portal-error-state="member-readiness-load" /> : null}
      <PageHeader
        title="Career Readiness"
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">Your readiness score across 4 key categories.</span>
            <span className="wa-hidden md:wa-block">Track your progress from training to landing a job. Your counselor updates this as you hit milestones.</span>
          </>
        }
        breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Job Readiness' }]}
      />
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <ReadinessMobileScoreCard
          overallScore={overallScore}
          categories={categories}
          priorityAction={priorityAction}
        />

        <div id="readiness-coach-panel" className="portal-pad-x" style={{ marginTop: '1rem', scrollMarginTop: '6rem' }}>
          <CompactReadinessCoach />
        </div>

        <ReadinessCoachReturnButton />      </div>

      {/* ── DESKTOP ── */}
      <div className="wa-hidden md:wa-block">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          <div>
          {/* Score summary — desktop metric strip */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {/* Overall score ring */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', background: 'var(--surface-container-low)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', flex: '0 0 auto' }}>
                <div style={{ position: 'relative', width: '5rem', height: '5rem', flexShrink: 0 }}>
                  <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 80 80" aria-hidden>
                    <circle cx="40" cy="40" r="34" fill="transparent" stroke="var(--surface-container-high)" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="transparent"
                      stroke="var(--color-accent)" strokeWidth="6"
                      strokeDasharray={213.6}
                      strokeDashoffset={213.6 - (213.6 * overallScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{overallScore}</span>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>/ 100</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>Overall Score</p>
                  <p style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{overallScore}<span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}> / 100</span></p>
                  {priorityAction && (
                    <a href={priorityAction.href} className="hover:wa-underline" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', display: 'block', marginTop: '0.375rem' }}>
                      Next: {priorityAction.label.slice(0, 50)}{priorityAction.label.length > 50 ? '…' : ''} →
                    </a>
                  )}
                </div>
              </div>

              {/* Category mini-metrics */}
              <div className="portal-metric-strip" style={{ flex: 1 }}>
                {categories.map((cat) => (
                  <div key={cat.label} className="portal-metric-card">
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.25rem' }}>
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1rem', color: cat.color, fontVariationSettings: "'FILL' 1" }}>{cat.icon}</span>
                    </div>
                    <p className="portal-metric-card__value" style={{ fontSize: '1.375rem', color: cat.pct >= 60 ? cat.color : 'var(--color-on-surface)', fontVariantNumeric: 'tabular-nums' }}>{cat.pct}%</p>
                    <p className="portal-metric-card__label">{cat.label}</p>
                    <div className="portal-progress-bar portal-progress-bar--thin" style={{ marginTop: '0.5rem' }}>
                      <div className="portal-progress-bar__fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ReadinessMemberClient
            initialSections={checklistSections ?? []}
            loadError={checklistSections === null ? 'Couldn\'t load your checklist — try refreshing the page.' : null}
          />
          </div>

          <aside
            id="readiness-coach-panel"
            style={{
              position: 'sticky',
              top: 'calc(var(--main-nav-layout-height, 4rem) + 1rem)',
              scrollMarginTop: '6rem',
            }}
          >
            <CompactReadinessCoach />
          </aside>
        </div>
      </div>
    </>
  );
}
