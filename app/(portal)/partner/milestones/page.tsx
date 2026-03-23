import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMilestonesView from '@/components/partner/PartnerMilestonesView';

export const metadata: Metadata = buildPageMetadata({
  title: 'Milestones',
  description: 'Certifications, placements, and activity for your referrals.',
  path: '/partner/milestones',
});

export default async function PartnerMilestonesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/milestones');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Milestones"
        subtitle="Recent certifications, placements, and milestone events across your referrals."
      />
      <PartnerMilestonesView />
    </div>
  );
}
