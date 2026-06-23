import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalTeamChatClient from '@/components/portal/PortalTeamChatClient';
import { getOrCreatePartnerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PortalCard from '@/components/portal/ui/PortalCard';
import { InboxRowLayout } from '@/components/portal/ui/inbox/InboxPrimitives';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Messages',
  description: 'Message the WorkforceAP team.',
  path: '/partner/messages',
});
}

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

  return (
    <PortalPageFrame>
      <>
        <PageHeader
          title="Messages"
          subtitle={
            <>
              <span className="wa-block md:wa-hidden">Direct line to your WorkforceAP partnership team</span>
              <span className="wa-hidden md:wa-block">Direct line to your WorkforceAP partnership team — referrals, milestones, and resources.</span>
            </>
          }
        />
        <div className="md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="portal-pad-x wa-mb-4">
            <PortalCard>
              <div className="portal-inbox-row__inner" style={{ padding: '0.25rem 0' }}>
                <InboxRowLayout
                  title="WorkforceAP Team"
                  preview={serializedMessages.length > 0 ? last?.body ?? 'No messages yet' : 'No messages yet — ask us anything'}
                  badge={<span className="material-symbols-outlined" aria-hidden>chevron_right</span>}
                />
              </div>
            </PortalCard>
          </div>

          <div className="portal-pad-x">
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
      </>
    </PortalPageFrame>
  );
}
