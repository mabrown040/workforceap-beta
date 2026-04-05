import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';
import PartnerMilestonesMobile from '@/components/partner/PartnerMilestonesMobile';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export const metadata: Metadata = buildPageMetadata({
  title: 'Milestones',
  description: 'Certificates, placements, and activity for your referrals.',
  path: '/partner/milestones',
});

export default async function PartnerMilestonesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/milestones');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <PortalPageFrame>
      {/* ── MOBILE SECTION ── */}
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader title="Milestones" subtitle="Review member certificates, placements, and progress events." />

        <PartnerMilestonesMobile />
        <MobileBottomNav variant="partner" />
      </div>

      {/* ── DESKTOP SECTION ── */}
      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title="Milestones"
          subtitle="Recent certificates, placements, and milestone events across your referrals."
        />
        <PartnerMilestonesView />
      </div>
    </PortalPageFrame>
  );
}
