import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { loadPartnerReferralBundle } from '@/lib/partner/referralBundle';
import { getProgramBySlug } from '@/lib/content/programs';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export const metadata: Metadata = buildPageMetadata({
  title: 'Outcomes snapshot',
  description: 'High-level outcomes for your referrals.',
  path: '/partner/outcomes',
});

export default async function PartnerOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/outcomes');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const { members, pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);

  const placements = members.filter((m) => m.placementRecord).length;
  const certified = members.filter((m) => m.userCertifications.length > 0).length;
  const inTraining = pipelineMembers.filter(
    (p) => p.stage === 'in_training' || p.stage === 'certified'
  ).length;

  const completions = pipelineMembers.filter((p) => {
    const program = p.member.enrolledProgram ? getProgramBySlug(p.member.enrolledProgram) : null;
    const done = (p.member.coursesCompleted as string[] | null) ?? [];
    return !!(program?.courses.length && program.courses.every((c) => done.includes(c.slug)));
  }).length;

  return (
    <PortalPageFrame>
      <div style={{ paddingBottom: '6rem' }} className="md:wa-pb-8">
        <PageHeader
          title="Outcomes snapshot"
          subtitle={`Quick counts for ${ctx.partner.name}. See the overview for journey detail.`}
          action={
            <Link href="/partner" className="btn btn-secondary btn-sm">
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
        <div className="md:wa-hidden">
          <MobileBottomNav variant="partner" />
        </div>
      </div>
    </PortalPageFrame>
  );
}
