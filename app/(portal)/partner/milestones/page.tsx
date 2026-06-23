import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';
import PartnerMilestonesMobile from '@/components/partner/PartnerMilestonesMobile';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Milestones',
  description: 'Certificates, placements, and activity for your referrals.',
  path: '/partner/milestones',
});
}

export default async function PartnerMilestonesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/milestones');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Milestones"
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">Review member certificates, placements, and progress events.</span>
            <span className="wa-hidden md:wa-block">Recent certificates, placements, and milestone events across your referrals.</span>
          </>
        }
        breadcrumbs={[{ label: 'Partner Portal', href: '/partner' }, { label: 'Milestones' }]}
      />
      {/* ── MOBILE SECTION ── */}
      <div className="wa-block md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PartnerMilestonesMobile />
      </div>

      {/* ── DESKTOP SECTION ── */}
      <div className="wa-hidden md:wa-block">
        <PartnerMilestonesView />
      </div>
    </PortalPageFrame>
  );
}
