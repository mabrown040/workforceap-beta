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
    <div className="partner-impact-console">
      <PageHeader
        title="Partner overview"
        subtitle={`${ctx.partner.name} referrals, progress, and placement outcomes in one place.`}
        action={
          <Link href="/partner/guide" className="btn btn-secondary btn-sm">
            Referral guide
          </Link>
        }
      />

      <section
        className="partner-referral-attribution partner-panel"
        aria-label="Referral link applications"
        data-tour="tour-referral-link"
      >
        <p className="partner-section-eyebrow">Referral link</p>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-gray-700)' }}>
          Applied via your referral link: <strong>{appliedViaReferralLink}</strong> — members who used your{' '}
          <code style={{ fontSize: '0.85em' }}>?ref=</code> link when they created an account. Members who apply without{' '}
          <code style={{ fontSize: '0.85em' }}>?ref=</code> still appear in your pipeline below but are not counted here.
        </p>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
          Share: <strong style={{ wordBreak: 'break-all' }}>{referralApplyUrl}</strong>
        </p>
        <CopyReferralLink url={referralApplyUrl} />
      </section>

      {total === 0 ? (
        <section className="partner-empty-state partner-panel">
          <div className="partner-empty-icon">👋</div>
          <h2>No referred members yet</h2>
          <p>
            Send applicants to <strong>workforceap.org/apply</strong> and have them list <strong>{ctx.partner.name}</strong> when asked how they heard about WorkforceAP. Referrals will show up here automatically.
          </p>
          <Link href="/partner/guide" className="btn btn-primary">
            Open referral guide
          </Link>
        </section>
      ) : (
        <>
          <section className="partner-impact-summary partner-panel">
            <div className="partner-impact-hero">
              <div className="partner-impact-hero-main">
                <span className="partner-impact-hero-value">{placements}</span>
                <span className="partner-impact-hero-label">Placed</span>
              </div>
              <div className="partner-impact-hero-secondary">
                <span className="partner-impact-hero-value">{completions}</span>
                <span className="partner-impact-hero-label">Program completions</span>
              </div>
              <div className="partner-impact-hero-secondary">
                <span className="partner-impact-hero-value">{inTraining}</span>
                <span className="partner-impact-hero-label">In training</span>
              </div>
            </div>

            <div className="partner-journey-strip">
              <span className="partner-journey-label">Journey snapshot</span>
              <div className="partner-journey-stages">
                {JOURNEY_STAGES.map((s) => (
                  <div
                    key={s}
                    className={`partner-journey-stage ${stageCounts[s] > 0 ? 'has-count' : ''}`}
                    title={PIPELINE_STAGE_LABELS[s]}
                  >
                    <span className="partner-journey-stage-count">{stageCounts[s] ?? 0}</span>
                    <span className="partner-journey-stage-label">{PIPELINE_STAGE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="partner-next-action partner-panel">
            <div className="partner-section-heading">
              <div>
                <p className="partner-section-eyebrow">What to do next</p>
                <h2>Keep momentum high with the clearest next step.</h2>
              </div>
            </div>
            <div className="partner-next-action-card">
              <p className="partner-next-action-label">{nextAction.label}</p>
              <p className="partner-next-action-tip">{nextAction.tip}</p>
              <Link href={nextAction.href} className="btn btn-secondary btn-sm">
                {nextAction.href === '/partner/guide' ? 'View guide' : 'Review members'}
              </Link>
            </div>
          </section>

          {nearCompletion.length > 0 && (
            <section className="partner-momentum partner-panel">
              <div className="partner-section-heading">
                <div>
                  <p className="partner-section-eyebrow">Near completion</p>
                  <h2>Members who could use a quick nudge.</h2>
                </div>
              </div>
              <p className="partner-momentum-desc">
                {nearCompletion.length} member{nearCompletion.length !== 1 ? 's' : ''} at 70%+ — a short check-in could help them finish strong.
              </p>
              <div className="partner-momentum-list">
                {nearCompletion.slice(0, 5).map((p) => (
                  <Link key={p.member.id} href={`/partner/members/${p.member.id}`} className="partner-momentum-item">
                    <span className="partner-momentum-name">{p.member.fullName}</span>
                    <span className="partner-momentum-progress">{p.progress}% · {p.programTitle}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="partner-panel">
            <div className="partner-section-heading">
              <div>
                <p className="partner-section-eyebrow">Member pipeline</p>
                <h2>Who you referred and where they are now.</h2>
              </div>
            </div>
            <PartnerMembersList members={toPartnerMembersListRows(pipelineMembers)} />
          </section>

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
    </PortalEntryClient>
  );
}
