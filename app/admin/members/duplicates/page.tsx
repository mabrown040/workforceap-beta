import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import MemberDuplicatesClient from '@/components/admin/MemberDuplicatesClient';
import MembersListNav from '@/components/admin/MembersListNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Duplicate Members',
  description: 'Find and merge duplicate member records by email.',
  path: '/admin/members/duplicates',
});

export default async function AdminMemberDuplicatesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members/duplicates');
  try { await requireAdmin(user.id); } catch { redirect('/dashboard'); }

  return (
    <PortalPageFrame>
      <PageHeader
        title="Duplicate Members"
        subtitle="Find and merge duplicate member records that share the same email address."
        breadcrumbs={[
          { label: 'Members', href: '/admin/members' },
          { label: 'Duplicates' },
        ]}
      />
      <MembersListNav />
      <MemberDuplicatesClient />
    </PortalPageFrame>
  );
}
