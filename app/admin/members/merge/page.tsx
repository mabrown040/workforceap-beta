import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import MemberMergeClient from '@/components/admin/MemberMergeClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Merge Members',
  description: 'Select two member records and merge the duplicate into the primary.',
  path: '/admin/members/merge',
});

export default async function AdminMemberMergePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/merge');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  return (
    <PortalPageFrame>
      <PageHeader
        title="Merge Members"
        subtitle="Search for two member records, preview what will be transferred, and confirm the merge."
        breadcrumbs={[
          { label: 'Members', href: '/admin/members' },
          { label: 'Merge' },
        ]}
      />
      <MemberMergeClient />
    </PortalPageFrame>
  );
}
