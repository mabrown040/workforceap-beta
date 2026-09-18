import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';
import PartnerMilestonesMobile from '@/components/partner/PartnerMilestonesMobile';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import { DesignSurface } from '@/components/portal/kit';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partner');
  return buildPageMetadataAsync({
    title: t('milestonesTitle'),
    description: t('milestonesGoal'),
    path: '/partner/milestones',
  });
}

export default async function PartnerMilestonesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/milestones');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const t = await getTranslations('partner');

  return (
    <PortalPageFrame>
      <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6 wa-pb-24 md:wa-pb-8">
        <PageHeader title={t('milestonesTitle')} subtitle={t('milestonesGoal')} />
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
