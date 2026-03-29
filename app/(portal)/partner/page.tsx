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
import PortalEntryClient from '@/components/onboarding/PortalEntryClient';
import { isSuperAdmin } from '@/lib/auth/roles';
import { PARTNER_PORTAL_TOUR_STEPS } from '@/lib/onboarding/portalTourSteps';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner Portal',
  description: 'Referral outcomes, training progress, and placements for your organization.',
  path: '/partner',
});

const JOURNEY_STAGES = ['applied', 'enrolled', 'in_training', 'certified', 'placed'] as const;

export default async function PartnerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const [appliedViaReferralLink, partnerRow] = await Promise.all([
    prisma.application.count({
      where: { referralPartnerId: ctx.partnerId },
    }),
    prisma.partner.findUnique({
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
    }),
  ]);

  if (!partnerRow) redirect('/dashboard');

  const applyLinkBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
  const refParam = partnerRow.referralCode ?? partnerRow.slug ?? ctx.partner.slug;
  const referralApplyUrl = `${applyLinkBase}/apply?ref=${encodeURIComponent(refParam)}`;

  const { members, pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const memberIds = members.map((m) => m.id);

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

  const conversionRate = total > 0 ? Math.round((placements / total) * 100) : 0;
  const verificationSpeed = total > 0 ? Math.min(100, Math.round((appliedViaReferralLink / total) * 100)) : 0;

  // Pending milestones count (open milestones needing review)
  const pendingMilestonesCount = stageCounts['in_training'] ?? 0;

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

    {/* ── MOBILE SECTION ── */}
    <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0.75rem' }}>
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#8c0f37] mb-1">Partner Overview</p>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-on-surface)', lineHeight: 1.1 }}>
          {ctx.partner.name}
        </h1>
        <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
          Strategic Partner
        </p>
      </div>

      {/* 2×2 KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem 1.5rem' }}>
        {/* Active Members */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem', border: '1px solid #ebe7e7', borderLeft: '4px solid #8c0f37' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Active Members</p>
          <p className="text-3xl font-black" style={{ color: 'var(--color-accent)', lineHeight: 1 }}>{total}</p>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>Referred to date</p>
        </div>
        {/* Placements */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem', border: '1px solid #ebe7e7' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Placements</p>
          <p className="text-3xl font-black" style={{ color: 'var(--color-on-surface)', lineHeight: 1 }}>{placements}</p>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>Verified hires</p>
        </div>
        {/* Certifications */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem', border: '1px solid #ebe7e7' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Certifications</p>
          <p className="text-3xl font-black" style={{ color: 'var(--color-gold)', lineHeight: 1 }}>{completions}</p>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>Earned by members</p>
        </div>
        {/* Needs Review */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', padding: '1rem', border: '1px solid #ebe7e7', borderLeft: '4px solid #8c0f37' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)', marginBottom: '0.25rem' }}>Needs Review</p>
          <p className="text-3xl font-black" style={{ color: 'var(--color-accent)', lineHeight: 1 }}>{pendingMilestonesCount}</p>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>Open milestones</p>
        </div>
      </div>

      {/* Recent Members */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--color-on-surface)' }}>Recent Members</p>
          <Link href="/partner/members" className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>View All</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recentMembers.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)', padding: '1rem 0' }}>No members yet. Share your referral link to get started.</p>
          ) : (
            recentMembers.map((p) => {
              const initials = (p.member.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
              const isPlaced = p.stage === 'placed';
              return (
                <Link key={p.member.id} href={`/partner/members/${p.member.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '0.75rem 1rem', border: '1px solid #ebe7e7', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>{p.member.fullName}</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{p.programTitle}</p>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: isPlaced ? '#dcfce7' : 'rgba(173,44,77,0.08)',
                      color: isPlaced ? '#166534' : 'var(--color-accent)',
                    }}>
                      {stageLabel}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Quick Actions</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/partner/milestones" className="active:scale-[0.98] transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.25rem' }}>flag</span>
            <div style={{ flex: 1 }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Review Milestones</p>
              <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{pendingMilestonesCount} pending approval</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
          <Link href="/partner/outcomes" className="active:scale-[0.98] transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-gold)', fontSize: '1.25rem' }}>bar_chart</span>
            <div style={{ flex: 1 }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Outcomes</p>
              <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>View placement reports</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
          <Link href="/partner/exports" className="active:scale-[0.98] transition-all" style={{ background: '#fff', border: '1px solid #ebe7e7', borderRadius: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#474646', fontSize: '1.25rem' }}>download</span>
            <div style={{ flex: 1 }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0 }}>Export Data</p>
              <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>CSV, PDF reports</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem' }}>arrow_forward_ios</span>
          </Link>
        </div>
      </div>

      <MobileBottomNav variant="portal" />
    </div>

    {/* ── DESKTOP SECTION ── */}
    <div className="wa-hidden wa-md:wa-block">
    <div className="partner-impact-console">

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
            Partner overview
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem' }}>
            {ctx.partner.name} referrals, progress, and placement outcomes in one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/partner/guide" style={{
            padding: '0.625rem 1.25rem',
            background: 'var(--surface-container-high)',
            color: 'var(--color-accent)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>summarize</span>
            Generate Report
          </Link>
          <Link href="/apply" style={{
            padding: '0.625rem 1.25rem',
            background: 'linear-gradient(to right, var(--color-accent), #71333e)',
            color: '#fff',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>person_add</span>
            New Referral
          </Link>
        </div>
      </div>

      {/* ── Referral Link Attribution ── */}
      <section
        className="partner-panel"
        aria-label="Referral link applications"
        data-tour="tour-referral-link"
        style={{ marginBottom: '2rem' }}
      >
        <p className="partner-section-eyebrow">Referral link</p>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
          Applied via your referral link: <strong>{appliedViaReferralLink}</strong>
        </p>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          Share: <strong style={{ wordBreak: 'break-all' }}>{referralApplyUrl}</strong>
        </p>
        <CopyReferralLink url={referralApplyUrl} />
      </section>

      {/* ── Journey Snapshot (5-col) ── */}
      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>Journey Snapshot</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
          {JOURNEY_STAGES.map((s, i) => (
            <div
              key={s}
              className="stitch-card"
              style={{
                padding: '1.25rem 1rem',
                textAlign: 'center',
                borderLeft: i === 0 ? '3px solid var(--color-accent)' : 'none',
              }}
            >
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1 }}>{stageCounts[s] ?? 0}</p>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>{PIPELINE_STAGE_LABELS[s]}</p>
            </div>
          ))}
        </div>
      </section>

      {total === 0 ? (
        <section className="partner-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '50%',
            background: 'var(--surface-container-highest)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: 'var(--color-on-surface-variant)' }}>group_add</span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>No referred members yet</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
            Send applicants to <strong>workforceap.org/apply</strong> and have them list <strong>{ctx.partner.name}</strong> when asked how they heard about WorkforceAP.
          </p>
          <Link href="/partner/guide" className="btn btn-primary">
            Open referral guide
          </Link>
        </section>
      ) : (
        <>
          {/* ── Main Bento: Member Pipeline + Sidebar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

            {/* Member Pipeline */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Member pipeline</p>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Who you referred and where they are now.</h2>
                </div>
              </div>

              {/* Member cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {pipelineMembers.slice(0, 5).map((p) => {
                  const initials = (p.member.fullName ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const stageLabel = (PIPELINE_STAGE_LABELS as Record<string, string>)[p.stage] ?? p.stage;
                  return (
                    <Link key={p.member.id} href={`/partner/members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="stitch-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background-color 0.15s' }}>
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
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>
                              ID: {p.member.id.slice(0, 8)} &middot; Last updated {p.progress}% complete
                            </p>
                          </div>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRadius: '9999px',
                          background: p.stage === 'placed' ? 'rgba(128,217,159,0.1)' : 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                          color: p.stage === 'placed' ? '#80d99f' : 'var(--color-accent)',
                          border: `1px solid ${p.stage === 'placed' ? 'rgba(128,217,159,0.2)' : 'rgba(173,44,77,0.2)'}`,
                        }}>
                          {stageLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <PartnerMembersList members={toPartnerMembersListRows(pipelineMembers)} />
            </section>

            {/* Partner Insights Sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Conversion Rate + Verification Speed */}
              <div className="stitch-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>Partner Insights</h3>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Conversion Rate</span>
                    <span style={{ color: 'var(--color-accent)' }}>{conversionRate}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${conversionRate}%`, height: '100%', background: 'var(--color-accent)', borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--color-on-surface)' }}>Verification Speed</span>
                    <span style={{ color: '#80d99f' }}>{verificationSpeed}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${verificationSpeed}%`, height: '100%', background: '#80d99f', borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
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
                <Link href="/partner/guide" style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Explore Resources
                </Link>
              </div>

              {/* Near Completion */}
              {nearCompletion.length > 0 && (
                <div className="stitch-card" style={{ padding: '1.5rem' }}>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>Near completion</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
                    {nearCompletion.length} member{nearCompletion.length !== 1 ? 's' : ''} at 70%+ — a check-in could help them finish.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {nearCompletion.slice(0, 3).map((p) => (
                      <Link key={p.member.id} href={`/partner/members/${p.member.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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

    </PortalEntryClient>
  );
}
