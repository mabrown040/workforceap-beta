import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerAttentionClient from '@/components/partner/PartnerAttentionClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Attention queue',
  description: 'Members who may need a partner check-in.',
  path: '/partner/attention',
});

export default async function PartnerAttentionPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/attention');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Attention queue"
        subtitle="Referrals in early stages without a recent update — log outreach so your team keeps momentum."
      />
      <PartnerAttentionClient />
    </div>
  );
}
