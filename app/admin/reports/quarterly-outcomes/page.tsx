import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { buildPageMetadataAsync } from '@/app/seo';
import QuarterlyOutcomesClient from './QuarterlyOutcomesClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Quarterly Outcomes',
    description: 'Grant-ready quarterly outcomes report',
    path: '/admin/reports/quarterly-outcomes',
  });
}

export default async function QuarterlyOutcomesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/reports/quarterly-outcomes');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');

  return <QuarterlyOutcomesClient />;
}
