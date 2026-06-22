import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Bell, TriangleAlert, UserPlus, Briefcase } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser, withAuthGuc } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getAdminCommandCenter, type AdminCommandCenter } from '@/lib/admin/commandCenter';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PageHeader from '@/components/portal/PageHeader';
import AdminCommandCenterClient from '@/components/admin/AdminCommandCenterClient';
import {
  CommandCenterKit,
  type CommandCenterQueueItem,
} from '@/components/portal/kit/pages/admin/CommandCenterKit';
import type { KpiItem } from '@/components/portal/kit';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Command Center',
    description: 'Today’s counselor queue for replies, risk follow-up, interviews, and pending applications.',
    path: '/admin/command-center',
  });
}

export default async function AdminCommandCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/command-center');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  // Single source of truth for both the kit (default) and the legacy view:
  // the real command-center loader. Re-establishes the auth GUC context (RSC
  // renders outside the root layout's gucContextStorage.run() scope, so without
  // this the queries would run with anonymous RLS credentials).
  const data: AdminCommandCenter = await withAuthGuc(() =>
    getAdminCommandCenter(user.id, { perSectionLimit: 8 }),
  ).catch((err) => {
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

  // v2 KIT is now the DEFAULT Command Center; legacy view via ?ui=legacy.
  // Runs AFTER the auth/role guard above (access control preserved) and is fed
  // by the real loader's totals/buckets — no fabricated counts.
  if (requestedUi !== 'legacy') {
    const { totals } = data;

    const kpis: KpiItem[] = [
      { label: 'At Risk', value: totals.atRiskCount, color: 'accent', delta: 'need outreach', deltaColor: 'accent' },
      { label: 'Needs Reply', value: totals.needsReplyCount, color: 'text', delta: 'member messages', deltaColor: 'muted' },
      { label: 'Interviewing', value: totals.interviewingCount, color: 'gold', delta: 'prep + offers', deltaColor: 'muted' },
      { label: 'Applications', value: totals.applicationsPendingCount, color: 'info', delta: 'awaiting review', deltaColor: 'muted' },
      {
        label: 'Oldest App',
        value: totals.oldestPendingApplicationDays == null ? '—' : `${totals.oldestPendingApplicationDays}d`,
        color: totals.oldestPendingApplicationDays != null && totals.oldestPendingApplicationDays >= 7 ? 'accent' : 'success',
        delta: 'pending review',
        deltaColor: 'muted',
      },
    ];

    const queueItems: CommandCenterQueueItem[] = [
      {
        id: 'at-risk',
        icon: <TriangleAlert size={14} aria-hidden />,
        iconColor: 'var(--wa-accent)',
        title: `${totals.atRiskCount} ${totals.atRiskCount === 1 ? 'student' : 'students'} inactive 14+ days`,
        detail: 'Enrolled, gone quiet — likely to drop',
        actionLabel: `${totals.atRiskCount} items`,
        urgent: totals.atRiskCount > 0,
        href: '/admin/command-center?ui=legacy',
      },
      {
        id: 'needs-reply',
        icon: <Bell size={14} aria-hidden />,
        iconColor: 'var(--wa-info)',
        title: `${totals.needsReplyCount} ${totals.needsReplyCount === 1 ? 'message' : 'messages'} awaiting your reply`,
        detail: 'Members are waiting on a response',
        actionLabel: `${totals.needsReplyCount} items`,
        href: '/admin/messages',
      },
      {
        id: 'applications',
        icon: <UserPlus size={14} aria-hidden />,
        iconColor: 'var(--wa-gold)',
        title: `${totals.applicationsPendingCount} ${totals.applicationsPendingCount === 1 ? 'application needs' : 'applications need'} review`,
        detail: 'Eligibility + program-fit review pending',
        actionLabel: `${totals.applicationsPendingCount} items`,
        href: '/admin/wioa-screening',
      },
      {
        id: 'interviewing',
        icon: <Briefcase size={14} aria-hidden />,
        iconColor: 'var(--wa-success)',
        title: `${totals.interviewingCount} ${totals.interviewingCount === 1 ? 'candidate' : 'candidates'} interviewing`,
        detail: 'Phone screens, interviews, and offers to prep',
        actionLabel: `${totals.interviewingCount} items`,
        href: '/admin/placements',
      },
    ];

    const dateLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());

    return (
      <CommandCenterKit
        dateLabel={dateLabel}
        kpis={kpis}
        queueItems={queueItems}
        addStudentHref="/admin/members/new"
      />
    );
  }

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
