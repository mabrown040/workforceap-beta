import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PartnerAttentionClient from '@/components/partner/PartnerAttentionClient';
import PartnerWorkflowTimeline from '@/components/partner/PartnerWorkflowTimeline';
import { listPartnerWorkflowEvents } from '@/lib/portal/workflowEvents';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Attention queue',
  description: 'Members who may need a partner check-in.',
  path: '/partner/attention',
});

export default async function PartnerAttentionPage({
  searchParams,
}: {
  searchParams?: Promise<{ tier?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/attention');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const sp = (await searchParams) ?? {};
  const tr = sp.tier;
  const initialTier =
    tr === 'high' || tr === 'medium' || tr === 'low' || tr === 'watch' || tr === 'all' ? tr : 'all';

  const rawEvents = await listPartnerWorkflowEvents(ctx.partnerId, 30);
  const events = rawEvents.map((e) => ({
    id: e.id,
    createdAt: e.createdAt.toISOString(),
    kind: e.kind,
    headline: e.headline,
    detail: e.detail,
    actorName: e.actor?.fullName ?? null,
  }));

  return (
    <div style={{ paddingBottom: '6rem' }} className="wa-md:wa-pb-8">
      <PageHeader
        title="Attention queue"
        subtitle="Risk-tiered queue with next best actions, owners, and a live workflow timeline."
      />
      <PartnerWorkflowTimeline events={events} />
      <PartnerAttentionClient initialTier={initialTier} />
      <div className="wa-md:wa-hidden">
        <MobileBottomNav variant="partner" />
      </div>
    </div>
  );
}
