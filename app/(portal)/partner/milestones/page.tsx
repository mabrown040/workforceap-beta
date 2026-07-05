import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';
import PartnerMilestonesMobile from '@/components/partner/PartnerMilestonesMobile';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';

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
      <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6 wa-pb-24 md:wa-pb-8">
        <SectionHeader
          kicker="Partner Portal"
          title="Milestones"
          goal="Recent certificates, placements, and milestone events across your referrals."
        />
        {/* ── MOBILE SECTION ── */}
        <div className="wa-block md:wa-hidden">
          <PartnerMilestonesMobile />
        </div>

        {/* ── DESKTOP SECTION ── */}
        <div className="wa-hidden md:wa-block">
          <PartnerMilestonesView />
        </div>
      </DesignSurface>
    </PortalPageFrame>
  );
}
