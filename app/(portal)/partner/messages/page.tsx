import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PortalTeamChatClient from '@/components/portal/PortalTeamChatClient';
import { getOrCreatePartnerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { ChevronRight } from 'lucide-react';
import { DesignSurface, SectionHeader, Avatar } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Messages',
    description: 'Message the WorkforceAP team.',
    path: '/partner/messages',
  });
}

const MESSAGES_SUBTITLE =
  'Direct line to your WorkforceAP partnership team — referrals, milestones, and resources.';

export default async function PartnerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/messages');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const thread = await getOrCreatePartnerMessageThread(ctx.partnerId);

  const messages = await prisma.message.findMany({
    take: 200,
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const serializedMessages = messages.map(serializeMessage);
  const last = serializedMessages[serializedMessages.length - 1] as { body?: string } | undefined;
  const previewText =
    serializedMessages.length > 0 ? last?.body ?? 'No messages yet' : 'No messages yet — ask us anything';

  return (
    <PortalPageFrame maxWidth="80rem">
      <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6">
        <SectionHeader kicker="Partner Portal" title="Messages" goal={MESSAGES_SUBTITLE} />

        <div className="md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="wa-mb-4">
            <div
              className="wa-kit-card wa-kit-card--sm"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Avatar initials="WA" size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--wa-text)' }}>WorkforceAP Team</div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--wa-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {previewText}
                </div>
              </div>
              <ChevronRight size={18} aria-hidden style={{ color: 'var(--wa-muted)', flexShrink: 0 }} />
            </div>
          </div>

          <PortalTeamChatClient
            surfaceVariant="partner"
            apiPath="/api/partner/messages"
            initial={{
              thread: {
                id: thread.id,
                portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
              },
              messages: serializedMessages,
              portalUserId: user.id,
            }}
            subtitle="We typically reply within one business day."
            emptyHint="No messages yet. Reach out about referrals, milestones, or program questions."
          />
        </div>

        <div className="wa-hidden md:wa-block">
          <PortalTeamChatClient
            surfaceVariant="partner"
            apiPath="/api/partner/messages"
            initial={{
              thread: {
                id: thread.id,
                portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
              },
              messages: serializedMessages,
              portalUserId: user.id,
            }}
            subtitle="We typically reply within one business day."
            emptyHint="No messages yet. Reach out about referrals, milestones, or program questions."
          />
        </div>
      </DesignSurface>
    </PortalPageFrame>
  );
}
