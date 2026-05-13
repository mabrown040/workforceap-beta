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
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Outcomes snapshot',
  description: 'High-level outcomes for your referrals.',
  path: '/partner/outcomes',
});
}

export default async function PartnerOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/outcomes');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

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
          title="Outcomes Snapshot"
          subtitle={`Quick counts for ${ctx.partner.name}. See the overview for journey detail.`}
          action={
            <Link href="/partner" className="btn btn-muted btn-sm">
              Partner overview
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
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>{members.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Total referrals</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{placements}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Placed</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)' }}>{pendingPlacementCount}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Pending review</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{certified}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>With certificate</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{inTraining}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>In training / certified stage</div>
          </div>
          <div className="partner-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{completions}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>Program completions</div>
          </div>
        </div>
        {pendingPlacementCount > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'rgba(255,193,7,0.08)',
              border: '1px solid rgba(255,193,7,0.2)',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)' }}>info</span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Pending Placement Reviews</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
              {pendingPlacementCount} member{pendingPlacementCount !== 1 ? 's' : ''} self-reported accepting a job offer. WorkforceAP staff are reviewing these reports before marking them as verified placements. You will see them move to "Placed" once confirmed.
            </p>
          </div>
        )}
        <div className="md:wa-hidden">
          <MobileBottomNav variant="partner" />
        </div>
      </div>
    </PortalPageFrame>
  );
}
