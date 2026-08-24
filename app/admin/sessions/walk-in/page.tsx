import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import PageHeader from '@/components/portal/PageHeader';
import WalkInSessionClient from '@/components/portal/sessions/WalkInSessionClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Walk-in session',
  description: 'Create a new member and run a guided 30-minute session — resume, cover letter, interview prep, all in one.',
  path: '/admin/sessions/walk-in',
});
}

export default async function AdminWalkInSessionPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/sessions/walk-in');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  return (
    <>
      <PageHeader
        title="Walk-in session"
        subtitle="Brand new member sitting with you. Start with their basics — we&rsquo;ll create their account and walk through resume, cover letter, and interview prep together."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'In-office sessions', href: '/admin/sessions' },
          { label: 'Walk-in' },
        ]}
      />
      <WalkInSessionClient
        counselorName={user.email ?? 'this admin'}
        runRedirectBase="/admin/sessions"
      />
    </>
  );
}
