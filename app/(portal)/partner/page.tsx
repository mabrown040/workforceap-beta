import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';
import { PIPELINE_STAGE_LABELS } from '@/lib/pipeline/stage';
import CopyReferralLink from '@/components/partner/CopyReferralLink';
import PartnerMembersList from '@/components/portal/PartnerMembersList';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { PARTNER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { partnerVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalKpiCard from '@/components/portal/PortalKpiCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner Portal',
  description: 'Referral outcomes, training progress, and placements for your organization.',
  path: '/partner',
});

const JOURNEY_STAGES = ['applied', 'enrolled', 'in_training', 'certified', 'placed'] as const;
const ACTIVE_STAGES = ['applied', 'enrolled', 'in_training', 'certified'] as const;

export default async function PartnerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const partnerRow = await prisma.partner.findUnique({
    where: { id: ctx.partnerId },
    select: {
      referralCode: true,
      slug: true,
      onboardingCompletedAt: true,
      name: true,
      organizationType: true,
      contactName: true,
      contactPhone: true,
      tourCompletedAt: true,
    },
  });

  if (!partnerRow) redirect('/dashboard');

  const applyLinkBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
  const refParam = partnerRow.referralCode ?? partnerRow.slug ?? ctx.partner.slug;
  const referralApplyUrl = `${applyLinkBase}/apply?ref=${encodeURIComponent(refParam)}`;

  const { members, pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const memberIds = members.map((m) => m.id);

  /** Distinct referred members who have at least one intake application tied to this partner link (apples-to-apples vs. total referrals). */
  const referredMembersAppliedViaLink =
    memberIds.length === 0
      ? 0
      : (
          await prisma.application.findMany({
            where: { referralPartnerId: ctx.partnerId, userId: { in: memberIds } },
            select: { userId: true },
            distinct: ['userId'],
          })
        ).length;

  const events =
    memberIds.length === 0
      ? []
      : await prisma.memberEvent.findMany({
          where: { userId: { in: memberIds } },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { user: { select: { fullName: true } } },
        });

  const stageCounts: Record<string, number> = {};
  for (const s of JOURNEY_STAGES) {
    stageCounts[s] = 0;
  }

  for (const p of pipelineMembers) {
    if (p.stage !== 'closed') {
      stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;
    }
  }

  const placements = members.filter((m) => m.placementRecord).length;
  const inTraining = pipelineMembers.filter((p) => p.stage === 'in_training' || p.stage === 'certified').length;
  const completions = pipelineMembers.filter((p) => {
    const program = p.member.enrolledProgram ? getProgramBySlug(p.member.enrolledProgram) : null;
    const done = (p.member.coursesCompleted as string[] | null) ?? [];
    return program?.courses.length && program.courses.every((c) => done.includes(c.slug));
  }).length;

  const total = members.length;

  const nextAction = total === 0
    ? { label: 'Share workforceap.org/apply with your community', href: '/partner/guide', tip: 'Ask applicants to list your organization when asked how they heard about us.' }
    : placements === 0 && inTraining > 0
      ? { label: `${inTraining} member${inTraining !== 1 ? 's' : ''} in training — encourage completion`, href: '/partner', tip: 'Check in with members who are close to finishing their program.' }
      : placements > 0
        ? { label: 'Celebrate placements, share more referrals', href: '/partner/guide', tip: 'Your referrals are landing jobs. Keep the pipeline full.' }
        : { label: 'Review member progress', href: '/partner', tip: 'Members are moving through the journey — track their outcomes.' };

  const nearCompletion = pipelineMembers.filter((p) => p.stage === 'in_training' && p.progress >= 70);

  const showPartnerOnboarding = partnerRow.onboardingCompletedAt == null;
  const showPartnerTour =
    partnerRow.onboardingCompletedAt != null && partnerRow.tourCompletedAt == null;
  const superAdmin = await isSuperAdmin(user.id);

  /** Share of referred members who reached a placed outcome (placements / total referrals). */
  const conversionRate = total > 0 ? Math.round((placements / total) * 100) : 0;
  /** Share of referred members who submitted an application recorded with your partner referral link. */
  const referralLinkUsagePct =
    total > 0 ? Math.min(100, Math.round((referredMembersAppliedViaLink / total) * 100)) : 0;

  // "Active members" = referred members currently in an active stage (not placed / not closed).
  const activeMembersCount = pipelineMembers.filter((p) =>
    (ACTIVE_STAGES as readonly string[]).includes(p.stage)
  ).length;

  // "Needs review" = a real, reviewable outreach queue based on current signals:
  // - early stages (applied/enrolled): likely need follow-up to move forward
  // - stalled training: in_training but progress still near-zero
  const needsReviewMembers = pipelineMembers.filter((p) => {
    if (p.stage === 'applied' || p.stage === 'enrolled') return true;
    if (p.stage === 'in_training' && (p.progress ?? 0) < 10) return true;
    return false;
  });
  const needsReviewCount = needsReviewMembers.length;

  const inTrainingCount = stageCounts['in_training'] ?? 0;

  // Recent members for mobile (top 4)
  const recentMembers = pipelineMembers.slice(0, 4);

  return (
    <PortalEntryClient
      portal="partner"
      showOnboardingWizard={showPartnerOnboarding}
      showTour={showPartnerTour}
      isSuperAdmin={superAdmin}
      tourSteps={PARTNER_PORTAL_TOUR_STEPS}
      wizardProps={{
        partnerName: partnerRow.name,
        organizationType: partnerRow.organizationType ?? '',
        contactName: partnerRow.contactName ?? '',
        contactPhone: partnerRow.contactPhone ?? '',
        referralApplyUrl,
      }}
    >
    <PortalPageFrame maxWidth="80rem">
    {/* ── MOBILE SECTION ── */}
    <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <p className="wa-text-[11px] wa-uppercase wa-tracking-[0.15em] wa-font-bold wa-text-[#8c0f37] wa-mb-1">Partner Dashboard</p>
        <h1 className="wa-text-3xl wa-font-extrabold wa-tracking-tight" style={{ color: 'var(--color-on-surface)', lineHeight: 1.1 }}>
          {ctx.partner.name}
        </h1>
        <p className="wa-text-sm wa-font-medium" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
          {partnerRow.organizationType || 'Partner'}
        </p>
      </div>

      <div className="portal-pad-x" style={{ paddingBottom: '0.75rem' }}>
        <VoiceAgentSurface {...partnerVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/partner/voice-session"
            title="Partner voice assistant"
            description="Ask about referrals, member progress, or using the partner portal."
            accent="#ea580c"
            accentDark="#c2410c"
            speakingLabel="Assistant is speaking…"
            listeningLabel="Listening — ask your question"
          />
        </VoiceAgentSurface>
      </div>

      {/* 2×2 KPI Grid */}
      <div className="portal-kpi-grid portal-pad-x" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
        <PortalKpiCard accent="accent" label="Active Members" value={activeMembersCount} hint="In progress" />
        <PortalKpiCard accent="neutral" label="Placements" value={placements} hint="Verified hires" />
        <PortalKpiCard accent="gold" label="Certificates" value={completions} hint="Earned by members" />
        <PortalKpiCard accent="accent" label="Needs Review" value={needsReviewCount} hint="Applied/enrolled or stalled" />
      </div>

      {/* Next Step Guidance */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <Link href={nextAction.href} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(173,44,77,0.08) 0%, rgba(173,44,77,0.02) 100%)',
            border: '1px solid rgba(173,44,77,0.15)',
            borderRadius: '0.875rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem', flexShrink: 0 }}>lightbulb</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>{nextAction.label}</p>
              <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{nextAction.tip}</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem', flexShrink: 0 }}>arrow_forward_ios</span>
          </div>
        </Link>
      </div>

      {/* Recent Members */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p className="wa-text-sm wa-font-bold" style={{ color: 'var(--color-on-surface)' }}>Recent Members</p>
          <Link href="/partner/referred-members" className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-wider" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>View All</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recentMembers.length === 0 ? (
            <PortalEmptyState
              title="No members yet"
              description="Share your referral link to start connecting applicants with WorkforceAP."
              icon={<span className="material-symbols-outlined">group_add</span>}
              primaryAction={{ label: 'Referral guide', href: '/partner/guide' }}
            />
          ) : (
            recentMembers.map((p) => {
              const initials = (p.member.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
              const isPlaced = p.stage === 'placed';
              return (
                <Link key={p.member.id} href={`/partner/referred-members/${p.member.id}`} style={{ textDecoration: 'none' }}>
                  <div className="portal-kpi-card" style={{ borderRadius: '0.75rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>{p.member.fullName}</p>
                      <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{p.programTitle}</p>
                    </div>
                    <StatusBadge
                      label={stageLabel}
                      variant={isPlaced ? 'success' : 'accent'}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <p className="wa-text-sm wa-font-bold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Quick Actions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/partner/milestones" className="active:scale-[0.98] wa-transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>flag</span>
            <div style={{ flex: 1 }}>
              <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Milestones & Updates</p>
              <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{inTrainingCount} currently in training</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
          <Link href="/partner/outcomes" className="active:scale-[0.98] wa-transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-gold)', fontSize: '1.25rem' }}>bar_chart</span>
            <div style={{ flex: 1 }}>
              <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Outcomes</p>
              <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>View placement reports</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
          <Link href="/partner/exports" className="active:scale-[0.98] wa-transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#474646', fontSize: '1.25rem' }}>download</span>
            <div style={{ flex: 1 }}>
              <p className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Export Data</p>
              <p className="wa-text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>CSV, PDF reports</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
        </div>
      </div>

      <MobileBottomNav variant="partner" />
    </div>

    {/* ── DESKTOP SECTION ── */}
    <div className="wa-hidden wa-md:wa-block">
    <div className="partner-impact-console">

      {/* ── Header ── */}
      <PageHeader
        title="Partner overview"
        subtitle={`${ctx.partner.name} referrals, progress, and placement outcomes in one place.`}
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/partner/outcomes" className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>summarize</span>
              Outcomes snapshot
            </Link>
            <Link href="/apply" className="btn btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>person_add</span>
              New Referral
            </Link>
          </div>
        }
      />

      <section style={{ marginBottom: '2rem' }}>
        <VoiceAgentSurface {...partnerVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/partner/voice-session"
            title="Partner voice assistant"
            description="Ask about referrals, member progress, or using the partner portal."
            accent="#ea580c"
            accentDark="#c2410c"
            speakingLabel="Assistant is speaking…"
            listeningLabel="Listening — ask your question"
          />
        </VoiceAgentSurface>
      </section>

      {/* ── Referral Link Attribution ── */}
      <section
        className="partner-panel"
        aria-label="Referral link applications"
        data-tour="tour-referral-link"
        style={{ marginBottom: '2rem' }}
      >
        <p className="partner-section-eyebrow">Referral link</p>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
          Applied via your referral link: <strong>{referredMembersAppliedViaLink}</strong>
        </p>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          Share: <strong style={{ wordBreak: 'break-all' }}>{referralApplyUrl}</strong>
        </p>
        <CopyReferralLink url={referralApplyUrl} />
      </section>

      {/* ── Next Step ── */}
      <section style={{ marginBottom: '2rem' }}>
        <Link href={nextAction.href} style={{ textDecoration: 'none' }}>
          <div className="portal-alert portal-alert--accent" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', flexShrink: 0 }}>lightbulb</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0 }}>{nextAction.label}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{nextAction.tip}</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem', flexShrink: 0 }}>arrow_forward</span>
          </div>
        </Link>
      </section>

      {/* ── Journey Snapshot (5-col) ── */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Journey Snapshot</p>
        <div className="portal-grid-metrics">
          {JOURNEY_STAGES.map((s, i) => (
            <div
              key={s}
              className="stitch-card stitch-card--padded-sm"
              style={{
                textAlign: 'center',
                borderLeft: i === 0 ? '3px solid var(--color-accent)' : 'none',
              }}
            >
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{stageCounts[s] ?? 0}</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>{PIPELINE_STAGE_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </section>

      {total === 0 ? (
        <PortalEmptyState
          icon={<span className="material-symbols-outlined">group_add</span>}
          title="No referred members yet"
          description={`Send applicants to workforceap.org/apply and have them list ${ctx.partner.name} when asked how they heard about WorkforceAP.`}
          primaryAction={{ label: 'Open referral guide', href: '/partner/guide' }}
        />
      ) : (
        <>
          {/* ── Main Bento: Member Pipeline + Sidebar ── */}
          <div className="portal-grid-metrics" style={{ marginBottom: '2rem' }}>

            {/* Member Pipeline */}
            <section>
              <div style={{ marginBottom: '1rem' }}>
                <h2 className="portal-section-heading" style={{ marginBottom: '0.25rem' }}>Member pipeline</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>Who you referred and where they are now.</p>
              </div>

              {/* Member cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {pipelineMembers.slice(0, 5).map((p) => {
                  const initials = (p.member.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
                  return (
                    <Link key={p.member.id} href={`/partner/referred-members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="stitch-card stitch-card--padded-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                            background: 'var(--surface-container-highest)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)',
                          }}>
                            {initials}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>{p.member.fullName}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                              {p.progress}% complete
                            </p>
                          </div>
                        </div>
                        <StatusBadge
                          label={stageLabel}
                          variant={p.stage === 'placed' ? 'success' : 'accent'}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <PartnerMembersList members={toPartnerMembersListRows(pipelineMembers)} />
            </section>

            {/* Partner Insights Sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Placement rate + referral link usage */}
              <div className="stitch-card stitch-card--padded">
                <h3 className="portal-section-title" style={{ marginBottom: '1.25rem' }}>Partner Insights</h3>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Placement rate</span>
                    <span style={{ color: 'var(--color-accent)' }}>{conversionRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${conversionRate}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Referral link usage</span>
                    <span style={{ color: 'var(--color-green)' }}>{referralLinkUsagePct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${referralLinkUsagePct}%`, height: '100%', background: 'var(--color-green)', borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
                    Share of your referred members who applied using your referral link.
                  </p>
                </div>
              </div>

              {/* Resource Center */}
              <div style={{
                padding: '1.5rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, rgba(173,44,77,0.15) 0%, rgba(173,44,77,0.05) 100%)',
                border: '1px solid rgba(173,44,77,0.15)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'block' }}>menu_book</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>Resource Center</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Guides, templates, and tools to maximize your referral impact.
                </p>
                <Link href="/partner/guide" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  Explore Resources
                </Link>
              </div>

              {/* Near Completion */}
              {nearCompletion.length > 0 && (
                <div className="stitch-card stitch-card--padded">
                  <p className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Near completion</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
                    {nearCompletion.length} member{nearCompletion.length !== 1 ? 's' : ''} at 70%+ — a check-in could help them finish.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {nearCompletion.slice(0, 3).map((p) => (
                      <Link key={p.member.id} href={`/partner/referred-members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(226,226,229,0.05)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>{p.member.fullName}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#80d99f' }}>{p.progress}%</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* ── Activity ── */}
          <section className="partner-activity partner-panel">
            <details className="partner-activity-collapsed">
              <summary>Recent activity</summary>
              {events.length === 0 ? (
                <p className="partner-activity-empty">No milestone events yet.</p>
              ) : (
                <ul>
                  {events.map((ev) => (
                    <li key={ev.id}>
                      <strong>{ev.user.fullName}</strong>
                      <span> · {ev.eventName}</span>
                      {ev.metadata && typeof ev.metadata === 'object' && ev.metadata !== null && 'label' in ev.metadata && (
                        <span> — {String((ev.metadata as { label?: string }).label)}</span>
                      )}
                      <span className="partner-activity-date">{ev.createdAt.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        </>
      )}
    </div>
    </div>
    </PortalPageFrame>
    </PortalEntryClient>
  );
}
