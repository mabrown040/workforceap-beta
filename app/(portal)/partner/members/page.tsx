import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMembersList from '@/components/portal/PartnerMembersList';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';

export const metadata: Metadata = buildPageMetadata({
  title: 'Referred members',
  description: 'All members referred by your organization.',
  path: '/partner/members',
});

export default async function PartnerMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/members');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const rows = toPartnerMembersListRows(pipelineMembers);

  return (
    <div>
      <PageHeader
        title="Referred members"
        subtitle="Search and filter everyone your organization has referred to WorkforceAP."
      />
      <PartnerMembersList members={rows} />
    </div>
  );
}
