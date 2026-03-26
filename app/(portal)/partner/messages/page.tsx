import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalTeamChatClient from '@/components/portal/PortalTeamChatClient';
import { getOrCreatePartnerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Message the WorkforceAP team.',
  path: '/partner/messages',
});

export default async function PartnerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/messages');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const thread = await getOrCreatePartnerMessageThread(ctx.partnerId);

  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Chat with the WorkforceAP team about referrals, member progress, and partner resources."
      />
      <PortalTeamChatClient
        apiPath="/api/partner/messages"
        initial={{
          thread: {
            id: thread.id,
            portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
          },
          messages: messages.map(serializeMessage),
          portalUserId: user.id,
        }}
        subtitle="We typically reply within one business day."
        emptyHint="No messages yet. Reach out about referrals, milestones, or program questions."
      />
    </div>
  );
}
