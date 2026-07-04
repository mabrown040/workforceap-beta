import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';
import { memberProgramCompleted } from '@/lib/partner/memberProgress';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partner');
  return buildPageMetadataAsync({
  title: t('outcomesSnapshotTitle'),
  description: t('outcomesSnapshotDescription'),
  path: '/partner/outcomes',
});
}

export default async function PartnerOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/outcomes');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const t = await getTranslations('partner');

  const { members, pipelineMembers, pendingPlacements } = await loadPartnerReferralBundle(
    ctx.partnerId,
    ctx.partner.organizationId,
  );

  const placements = members.filter((m) => m.placementRecord).length;
  const pendingPlacementCount = pendingPlacements.length;
  const certified = members.filter((m) => m.userCertifications.length > 0).length;
  const inTraining = pipelineMembers.filter(
    (p) => p.stage === 'in_training' || p.stage === 'certified'
  ).length;

  const completions = pipelineMembers.filter((p) => {
    return memberProgramCompleted(p.member.enrolledProgram, null, p.member.memberProgramProgress);
  }).length;

  return (
    <PortalPageFrame>
      <div style={{ paddingBottom: '6rem' }} className="md:wa-pb-8">
        <PageHeader
          title={t('outcomesSnapshotTitle')}
          subtitle={t('quickCountsFor', { partnerName: ctx.partner.name })}
          action={
            <Link href="/partner" className="btn btn-muted btn-sm">
              {t('partnerOverviewBtn')}
            </Link>
          }
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>{members.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('totalReferrals')}</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800 }}>{placements}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('placed')}</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800, color: 'var(--color-gold)' }}>{pendingPlacementCount}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('pendingReview')}</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800 }}>{certified}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('withCertificate')}</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800 }}>{inTraining}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('inTrainingCertifiedStage')}</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 800 }}>{completions}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('programCompletions')}</div>
          </div>
        </div>
        {pendingPlacementCount > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'color-mix(in srgb, var(--color-gold) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-gold)' }} aria-hidden="true">info</span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>{t('pendingPlacementReviews')}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
              {t('pendingPlacementDesc', { count: pendingPlacementCount })}
            </p>
          </div>
        )}
      </div>
    </PortalPageFrame>
  );
}
