import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import Link from 'next/link';
import PartnerAttentionClient from '@/components/partner/PartnerAttentionClient';
import PartnerWorkflowTimeline from '@/components/partner/PartnerWorkflowTimeline';
import { listPartnerWorkflowEvents } from '@/lib/portal/workflowEvents';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { DesignSurface, SectionHeader as KitSectionHeader } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Attention queue',
  description: 'Members who may need a partner check-in.',
  path: '/partner/attention',
});
}

export default async function PartnerAttentionPage({
  searchParams,
}: {
  searchParams?: Promise<{ tier?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/attention');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const sp = (await searchParams) ?? {};
  const tr = sp.tier;
  /** Default to high urgency so partners land on actionable items first (`all` is one click away). */
  const initialTier =
    tr === 'high' || tr === 'medium' || tr === 'low' || tr === 'watch' || tr === 'all' ? tr : 'high';

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
    <PortalPageFrame maxWidth="80rem">
      <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6 md:wa-pb-8">
        <nav aria-label="Breadcrumb" className="wa-text-xs" style={{ color: 'var(--wa-muted)' }}>
          <Link href="/partner" style={{ color: 'var(--wa-accent)' }}>
            Partner Portal
          </Link>
          <span aria-hidden style={{ margin: '0 0.4rem' }}>
            /
          </span>
          <span aria-current="page">Attention Queue</span>
        </nav>
        <KitSectionHeader
          kicker="Partner Portal"
          title="Attention Queue"
          goal="Risk-tiered queue with next best actions, owners, and a live workflow timeline."
        />
        <PartnerWorkflowTimeline events={events} />
        <PartnerAttentionClient initialTier={initialTier} />
      </DesignSurface>
    </PortalPageFrame>
  );
}
