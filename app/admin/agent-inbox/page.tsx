import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
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
 * Read-only first cut of the agent inbox. Shows every cascade currently
 * waiting for counselor review, oldest first. Approve / Edit / Dismiss
 * controls land in Thursday's PR.
 *
 * Auth: visible to admins AND counselors. Both can review.
 */
export default async function AgentInboxPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/agent-inbox');

  const [adminOk, counselorOk] = await Promise.all([
    isAdmin(user.id),
    isCounselor(user.id),
  ]);
  if (!adminOk && !counselorOk) redirect('/dashboard');

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
