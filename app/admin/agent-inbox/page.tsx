import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';

import { listAwaitingApprovalCascades } from '@/lib/milestoneCascade/queries';
import { getCascadeMetrics } from '@/lib/milestoneCascade/metrics';
import { AgentInboxClient } from './AgentInboxClient';
import { InboxStatsBlock } from './InboxStatsBlock';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agent Inbox · Admin',
};

/**
 * Agent inbox — admin-only.
 *
 * Shows every cascade currently waiting for review, oldest first. Counselor
 * access is a follow-up: it requires the list query and the underlying
 * approve/dismiss endpoints to filter by counselor_assignment, so a
 * counselor can only see and act on cascades for members assigned to them.
 * Until that's wired, this page (and the API routes it drives) are
 * admin-only — matching the /admin/* layout guard.
 */
export default async function AgentInboxPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/agent-inbox');
  // The /admin layout already enforces isAdmin, but check again here so
  // this page's auth contract is self-evident from the file.
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const [cascades, metrics] = await Promise.all([
    listAwaitingApprovalCascades({ limit: 100 }),
    getCascadeMetrics({ windowDays: 7 }),
  ]);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Agent Inbox"
        subtitle={
          cascades.length === 0
            ? 'No cascades awaiting review right now.'
            : `${cascades.length} cascade${cascades.length === 1 ? '' : 's'} awaiting your review`
        }
      />
      <InboxStatsBlock metrics={metrics} />
      <AgentInboxClient cascades={JSON.parse(JSON.stringify(cascades))} />
    </PortalPageFrame>
  );
}
