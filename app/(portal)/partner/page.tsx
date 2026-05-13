import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { prisma } from '@/lib/db/prisma';
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
import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { partnerVoiceSurface } from '@/lib/portal/voice';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import PortalCard from '@/components/portal/ui/PortalCard';
import DataTable from '@/components/portal/ui/DataTable';
import type { DataTableColumn } from '@/components/portal/ui/DataTable';
import PartnerReferralResourcesSection from '@/components/partner/PartnerReferralResourcesSection';
import { getPartnerPlacementPayoutUsd } from '@/lib/partner/partnerPayout';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Partner Portal',
  description: 'Referral outcomes, training progress, and placements for your organization.',
  path: '/partner',
});
}

const JOURNEY_STAGES = ['applied', 'enrolled', 'in_training', 'certified', 'placed'] as const;

export default async function PartnerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const superAdmin = await isSuperAdmin(user.id);

  const ctx = await getPartnerForUser(user.id, { isSuperAdminHint: superAdmin });
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

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

  if (!partnerRow) redirect(await unlinkedPartnerHref(user.id));

  const applyLinkBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
  const refParam = partnerRow.referralCode ?? partnerRow.slug ?? ctx.partner.slug;
  const referralApplyUrl = `${applyLinkBase}/apply?ref=${encodeURIComponent(refParam)}`;

  const { members, pipelineMembers, pendingPlacements } = await loadPartnerReferralBundle(
    ctx.partnerId,
    ctx.partner.organizationId,
  );
  const memberIds = members.map((m) => m.id);
  const pendingPlacementCount = pendingPlacements.length;

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

  const total = members.length;

  const payoutPerPlacement = getPartnerPlacementPayoutUsd();
  const enrolledCount = members.filter((m) => m.enrolledAt != null).length;
  const estimatedPayout = placements * payoutPerPlacement;
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const pendingUserIds = new Set(pendingPlacements.map((p) => p.userId));
  const referralTableRows = pipelineMembers.map((p) => {
    const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
    const enrollmentDate = p.member.enrolledAt ? p.member.enrolledAt.toLocaleDateString() : '—';
    const placementDate = p.member.placementRecord?.placedAt ? p.member.placementRecord.placedAt.toLocaleDateString() : '—';
    let payoutStatus = 'Not placed';
    if (p.member.placementRecord) payoutStatus = 'Included in estimate';
    else if (pendingUserIds.has(p.member.id)) payoutStatus = 'Pending verification';
    return {
      id: p.member.id,
      fullName: p.member.fullName ?? 'Member',
      stage: p.stage,
      stageLabel,
      enrollmentDate,
      placementDate,
      payoutStatus,
    };
  });

  type ReferralDashRow = (typeof referralTableRows)[number];
  const referralColumns: DataTableColumn<ReferralDashRow>[] = [
    {
      key: 'name',
      header: 'Name',
      rowHeader: true,
      cell: (row) => (
        <Link
          href={`/partner/referred-members/${row.id}`}
          style={{ fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          {row.fullName}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <StatusBadge label={row.stageLabel} variant={row.stage === 'placed' ? 'success' : 'accent'} />
      ),
    },
    {
      key: 'enrolled',
      header: 'Enrollment date',
      hideOnMobile: true,
      cell: (row) => row.enrollmentDate,
    },
    {
      key: 'placed',
      header: 'Placement date',
      hideOnMobile: true,
      cell: (row) => row.placementDate,
    },
    {
      key: 'payout',
      header: 'Payout status',
      cell: (row) => row.payoutStatus,
    },
  ];

  const nextAction = total === 0
    ? { label: 'Share workforceap.org/apply with your community', href: '/partner/guide', tip: 'Ask applicants to list your organization when asked how they heard about us.' }
    : pendingPlacementCount > 0
      ? { label: `${pendingPlacementCount} member${pendingPlacementCount !== 1 ? 's' : ''} reported a job offer — review needed`, href: '/partner/outcomes', tip: 'WorkforceAP is reviewing these offers. You will see verified placements once confirmed.' }
      : placements === 0 && inTraining > 0
        ? { label: `${inTraining} member${inTraining !== 1 ? 's' : ''} in training — encourage completion`, href: '/partner', tip: 'Check in with members who are close to finishing their program.' }
        : placements > 0
          ? { label: 'Celebrate placements, share more referrals', href: '/partner/guide', tip: 'Your referrals are landing jobs. Keep the pipeline full.' }
          : { label: 'Review member progress', href: '/partner', tip: 'Members are moving through the journey — track their outcomes.' };

  const nearCompletion = pipelineMembers.filter((p) => p.stage === 'in_training' && p.progress >= 70);

  const showPartnerOnboarding = partnerRow.onboardingCompletedAt == null;
  const showPartnerTour =
    partnerRow.onboardingCompletedAt != null && partnerRow.tourCompletedAt == null;

  /** Share of referred members who reached a placed outcome (placements / total referrals). */
  const conversionRate = total > 0 ? Math.round((placements / total) * 100) : 0;
  /** Share of referred members who submitted an application recorded with your partner referral link. */
  const referralLinkUsagePct =
    total > 0 ? Math.min(100, Math.round((referredMembersAppliedViaLink / total) * 100)) : 0;

  const inTrainingCount = stageCounts['in_training'] ?? 0;

  return (
    <PortalEntryClient
      portal="partner"
      tourStorageUserId={user.id}
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
      <h1 className="wa-sr-only">
        Partner Overview — {ctx.partner.name}
      </h1>
    {/* ── MOBILE SECTION ── */}
    <div className="wa-block md:wa-hidden portal-mobile-content">
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <p
          className="wa-text-[11px] wa-uppercase wa-tracking-[0.15em] wa-font-bold wa-mb-1"
          style={{ color: 'var(--color-accent)' }}
        >
          Partner Dashboard
        </p>
        <h2 className="wa-text-3xl wa-font-extrabold wa-tracking-tight" style={{ color: 'var(--color-on-surface)', lineHeight: 1.1 }}>
          {ctx.partner.name}
        </h2>
        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
          {partnerRow.organizationType || 'Partner Organization'}
        </p>
      </div>

      {/* Estimated payout + KPI strip */}
      <div className="portal-pad-x" style={{ paddingTop: '0.5rem', paddingBottom: '0.75rem' }}>
        <div
          className="portal-card portal-card--flat portal-card--padded"
          style={{ borderLeft: '4px solid var(--color-gold)', marginBottom: '1rem' }}
        >
          <p
            className="wa-text-[11px] wa-uppercase wa-tracking-[0.12em] wa-font-bold wa-mb-1"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            Estimated payout
          </p>
          <p className="wa-text-3xl wa-font-extrabold wa-tracking-tight" style={{ color: 'var(--color-on-surface)', margin: 0 }}>
            {fmtMoney(estimatedPayout)}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', lineHeight: 1.45 }}>
            {placements} verified placement{placements !== 1 ? 's' : ''} × {fmtMoney(payoutPerPlacement)} each. Final amounts follow your partner agreement.
          </p>
        </div>

        <div
          className="portal-kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.625rem',
          }}
        >
          <PortalKpiCard accent="accent" label="Members referred" value={total} hint="In your portal" />
          <PortalKpiCard accent="neutral" label="Members enrolled" value={enrolledCount} hint="Started a program" />
          <PortalKpiCard accent="green" label="Members placed" value={placements} hint="Verified hires" href="/partner/outcomes" />
          <PortalKpiCard accent="gold" label="Est. payout" value={fmtMoney(estimatedPayout)} hint="Placement estimate" />
        </div>
      </div>

      <div className="portal-pad-x" style={{ paddingBottom: '1rem' }} data-tour="tour-referral-link">
        <PortalCard
          title="Referral link"
          subtitle={`Applied via your link: ${referredMembersAppliedViaLink}`}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', wordBreak: 'break-all' }}>
            {referralApplyUrl}
          </p>
          <CopyReferralLink url={referralApplyUrl} referralCodeDisplay={partnerRow.referralCode ?? partnerRow.slug ?? refParam} />
        </PortalCard>
      </div>

      <div className="portal-pad-x" style={{ paddingBottom: '1rem' }}>
        <PortalCard
          title="Referred members"
          subtitle="Enrollment and placement dates reflect WorkforceAP records."
          action={
            <Link href="/partner/referred-members" className="portal-section-action wa-text-[11px]">
              View all
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                arrow_forward
              </span>
            </Link>
          }
        >
          <DataTable
            columns={referralColumns}
            rows={referralTableRows}
            rowKey={(row) => row.id}
            density="compact"
            emptyState={
              <PortalEmptyState
                title="No referred members yet"
                description="Share your referral link so applicants can enroll with your organization attributed."
                icon={<span className="material-symbols-outlined">group_add</span>}
                primaryAction={{ label: 'Referral guide', href: '/partner/guide' }}
              />
            }
          />
        </PortalCard>
      </div>

      <div className="portal-pad-x" style={{ paddingBottom: '1rem' }}>
        <PartnerReferralResourcesSection partnerName={partnerRow.name} referralApplyUrl={referralApplyUrl} />
      </div>

      {/* Next Step Guidance */}
      <div style={{ padding: '0.75rem 1.25rem 1rem' }}>
        <Link href={nextAction.href} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(173,44,77,0.1) 0%, rgba(173,44,77,0.03) 100%)',
            border: '1px solid rgba(173,44,77,0.18)',
            borderRadius: '0.875rem',
            padding: '1rem 1.125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
          }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(173,44,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>{nextAction.label}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>{nextAction.tip}</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem', flexShrink: 0 }}>chevron_right</span>
          </div>
        </Link>
      </div>

      {/* Assistant (collapsed by default; never above KPIs on mobile) */}
      <div className="portal-pad-x" style={{ paddingBottom: '0.75rem' }}>
        <details className="portal-card portal-card--compact">
          <summary className="portal-card__summary">
            Partner assistant
            <span className="portal-card__summary-hint">(tap to open)</span>
          </summary>
          <div className="portal-card__body">
            <VoiceAgentSurface {...partnerVoiceSurface}>
              <PortalVoiceSessionLazy
                sessionEndpoint="/api/partner/voice-session"
                title="Partner Assistant"
                description="Ask about referrals, member progress, or using the partner portal."
                accent="var(--color-amber)"
                accentDark="var(--color-amber)"
                speakingLabel="Assistant is speaking…"
                listeningLabel="Listening — ask your question"
              />
            </VoiceAgentSurface>
          </div>
        </details>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <p className="wa-text-sm wa-font-bold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Quick Actions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/partner/milestones" className="wa-no-underline active:scale-[0.98] wa-transition-all">
            <PortalCard className="portal-card--compact">
              <div className="portal-inbox-row__inner" style={{ padding: '0.1rem 0' }}>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>flag</span>
                </div>
                <div className="portal-inbox-row__main">
                  <div className="portal-inbox-row__top">
                    <div className="portal-inbox-row__title">Milestones & Updates</div>
                  </div>
                  <div className="portal-inbox-row__preview">{inTrainingCount} currently in training</div>
                </div>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ opacity: 0.7 }}>arrow_forward_ios</span>
                </div>
              </div>
            </PortalCard>
          </Link>

          <Link href="/partner/outcomes" className="wa-no-underline active:scale-[0.98] wa-transition-all">
            <PortalCard className="portal-card--compact">
              <div className="portal-inbox-row__inner" style={{ padding: '0.1rem 0' }}>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-gold)', fontSize: '1.25rem' }}>bar_chart</span>
                </div>
                <div className="portal-inbox-row__main">
                  <div className="portal-inbox-row__top">
                    <div className="portal-inbox-row__title">Outcomes</div>
                  </div>
                  <div className="portal-inbox-row__preview">View placement reports</div>
                </div>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ opacity: 0.7 }}>arrow_forward_ios</span>
                </div>
              </div>
            </PortalCard>
          </Link>

          <Link href="/partner/exports" className="wa-no-underline active:scale-[0.98] wa-transition-all">
            <PortalCard className="portal-card--compact">
              <div className="portal-inbox-row__inner" style={{ padding: '0.1rem 0' }}>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.25rem' }}>download</span>
                </div>
                <div className="portal-inbox-row__main">
                  <div className="portal-inbox-row__top">
                    <div className="portal-inbox-row__title">Export Data</div>
                  </div>
                  <div className="portal-inbox-row__preview">CSV, PDF reports</div>
                </div>
                <div className="portal-inbox-row__badge" aria-hidden>
                  <span className="material-symbols-outlined" style={{ opacity: 0.7 }}>arrow_forward_ios</span>
                </div>
              </div>
            </PortalCard>
          </Link>
        </div>
      </div>

      <MobileBottomNav variant="partner" />
    </div>

    {/* ── DESKTOP SECTION ── */}
    <div className="wa-hidden md:wa-block">
    <div className="partner-impact-console">

      {/* ── Header ── */}
      <PageHeader
        title="Partner Overview"
        titleHeadingLevel={2}
        subtitle={`${ctx.partner.name} referrals, progress, and placement outcomes in one place.`}
        action={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/partner/outcomes" className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>summarize</span>
              Outcomes snapshot
            </Link>
            <Link href={referralApplyUrl} className="btn btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>person_add</span>
              New Referral
            </Link>
          </div>
        }
      />

      <section style={{ marginBottom: '1.25rem' }}>
        <div
          className="portal-card portal-card--flat portal-card--padded"
          style={{ borderLeft: '4px solid var(--color-gold)' }}
        >
          <p className="partner-section-eyebrow" style={{ marginBottom: '0.35rem' }}>
            Estimated payout
          </p>
          <p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.1 }}>
            {fmtMoney(estimatedPayout)}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', maxWidth: '42rem', lineHeight: 1.5 }}>
            {placements} verified placement{placements !== 1 ? 's' : ''} × {fmtMoney(payoutPerPlacement)} each. Estimates are illustrative; actual payouts follow your partner agreement.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <div
          className="portal-grid-metrics"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
            gap: '1rem',
          }}
        >
          <PortalKpiCard accent="accent" label="Members referred" value={total} hint="In your portal" />
          <PortalKpiCard accent="neutral" label="Members enrolled" value={enrolledCount} hint="Started a program" />
          <PortalKpiCard accent="green" label="Members placed" value={placements} hint="Verified hires" href="/partner/outcomes" />
          <PortalKpiCard accent="gold" label="Est. payout" value={fmtMoney(estimatedPayout)} hint="Placement estimate" />
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }} data-tour="tour-referral-link">
        <PortalCard
          title="Referral link"
          subtitle={`Applied via your link: ${referredMembersAppliedViaLink}`}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', wordBreak: 'break-all' }}>
            {referralApplyUrl}
          </p>
          <CopyReferralLink url={referralApplyUrl} referralCodeDisplay={partnerRow.referralCode ?? partnerRow.slug ?? refParam} />
        </PortalCard>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <PortalCard
          title="Referred members"
          subtitle="Name, journey status, enrollment and placement dates, and how each member contributes to your payout estimate."
          action={
            <Link href="/partner/referred-members" className="portal-section-action">
              View all
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                arrow_forward
              </span>
            </Link>
          }
        >
          <DataTable
            columns={referralColumns}
            rows={referralTableRows}
            rowKey={(row) => row.id}
            emptyState={
              <PortalEmptyState
                icon={<span className="material-symbols-outlined">group_add</span>}
                title="No referred members yet"
                description={`Send applicants to workforceap.org/apply and have them list ${ctx.partner.name} when asked how they heard about WorkforceAP.`}
                primaryAction={{ label: 'Open referral guide', href: '/partner/guide' }}
              />
            }
          />
        </PortalCard>
      </section>

      <PartnerReferralResourcesSection partnerName={partnerRow.name} referralApplyUrl={referralApplyUrl} />

      <section style={{ marginBottom: '2rem' }}>
        <VoiceAgentSurface {...partnerVoiceSurface}>
          <PortalVoiceSessionLazy
            sessionEndpoint="/api/partner/voice-session"
            title="Partner Assistant"
            description="Ask about referrals, member progress, or using the partner portal."
            accent="var(--color-amber)"
            accentDark="var(--color-amber)"
            speakingLabel="Assistant is speaking…"
            listeningLabel="Listening — ask your question"
          />
        </VoiceAgentSurface>
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

      {/* ── Journey Snapshot (5-col metric strip) ── */}
      <section style={{ marginBottom: '2rem' }}>
        <p className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Journey Snapshot</p>
        <div className="portal-grid-metrics">
          {JOURNEY_STAGES.map((s, i) => (
            <div
              key={s}
              className="portal-card portal-card--flat portal-card--padded-sm"
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

      <>
          {/* ── Main Bento: Member Pipeline + Sidebar ── */}
          <div className="portal-grid-metrics" style={{ marginBottom: '2rem' }}>

            {/* Member Pipeline */}
            <section>
              <div className="portal-section-header" style={{ marginBottom: '1rem' }}>
                <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Member Pipeline</h2>
                <Link href="/partner/referred-members" className="portal-section-action">
                  View all
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>arrow_forward</span>
                </Link>
              </div>

              {/* Member cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                {pipelineMembers.slice(0, 5).map((p) => {
                  const initials = (p.member.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
                  return (
                    <Link key={p.member.id} href={`/partner/referred-members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '2.25rem', height: '2.25rem', borderRadius: '9999px',
                            background: 'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>{p.member.fullName}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <div className="portal-progress-bar portal-progress-bar--thin" style={{ width: '60px' }}>
                                <div className="portal-progress-bar__fill" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>{p.progress}%</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                          <StatusBadge
                            label={stageLabel}
                            variant={p.stage === 'placed' ? 'success' : 'accent'}
                          />
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3 }}>chevron_right</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <PartnerMembersList members={toPartnerMembersListRows(pipelineMembers)} />
            </section>

            {/* Partner Insights Sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Placement rate + referral link usage */}
              <div className="portal-card portal-card--flat portal-card--padded">
                <h3 className="portal-section-title" style={{ marginBottom: '1.25rem' }}>Partner Insights</h3>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Placement rate</span>
                    <span style={{ color: 'var(--color-accent)', fontSize: '1rem' }}>{conversionRate}%</span>
                  </div>
                  <div className="portal-progress-bar">
                    <div className="portal-progress-bar__fill" style={{ width: `${conversionRate}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Referral link usage</span>
                    <span style={{ color: 'var(--color-green)', fontSize: '1rem' }}>{referralLinkUsagePct}%</span>
                  </div>
                  <div className="portal-progress-bar portal-progress-bar--gold">
                    <div className="portal-progress-bar__fill" style={{ width: `${referralLinkUsagePct}%`, background: 'var(--color-green)' }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
                    Members who applied using your referral link.
                  </p>
                </div>
              </div>

              {/* Near Completion */}
              {nearCompletion.length > 0 && (
                <div className="portal-card portal-card--flat portal-card--padded">
                  <p className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Near completion</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
                    {nearCompletion.length} member{nearCompletion.length !== 1 ? 's' : ''} at 70%+ — a check-in could help them finish.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {nearCompletion.slice(0, 3).map((p) => (
                      <Link key={p.member.id} href={`/partner/referred-members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(226,226,229,0.05)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>{p.member.fullName}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-green)' }}>{p.progress}%</span>
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
    </div>
    </div>
    </PortalPageFrame>
    </PortalEntryClient>
  );
}
