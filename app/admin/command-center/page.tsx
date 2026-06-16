import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser, withAuthGuc } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getAdminCommandCenter } from '@/lib/admin/commandCenter';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import AdminCommandCenterClient from '@/components/admin/AdminCommandCenterClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Command Center',
    description: 'Today’s counselor queue for replies, risk follow-up, interviews, and pending applications.',
    path: '/admin/command-center',
  });
}

export default async function AdminCommandCenterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/command-center');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const data = await withAuthGuc(() => getAdminCommandCenter(user.id, { perSectionLimit: 8 })).catch((err) => {
    console.error('[admin/command-center] failed to load command center:', err);
    return {
      needsReply: [],
      atRisk: [],
      interviewing: [],
      applicationsPending: [],
      totals: {
        needsReplyCount: 0,
        atRiskCount: 0,
        interviewingCount: 0,
        applicationsPendingCount: 0,
        oldestPendingApplicationDays: null,
      },
    };
  });

  return (
    <PortalPageFrame maxWidth="88rem">
      <PageHeader
        title="Command Center"
        subtitle="The exact queue to run a walk-in session: reply, check in, prep interviews, review applications."
      />
      <AdminCommandCenterClient data={data} />
    </PortalPageFrame>
  );
}
