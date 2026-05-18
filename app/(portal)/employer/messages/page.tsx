import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerMessagesInboxClient from '@/components/portal/EmployerMessagesInboxClient';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import { buildEmployerInbox } from '@/lib/messages/employerInbox';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('employerMessagesMetaTitle'),
    description: t('employerMessagesMetaDesc'),
    path: '/employer/messages',
  });
}

export default async function EmployerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/messages');
  const t = await getTranslations('messages');
  const te = await getTranslations('employer');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const messages = await prisma.message.findMany({
    take: 200,
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const serializedMessages = messages.map(serializeMessage);
  const { team: teamRow, candidates: candidateRows } = await buildEmployerInbox(ctx.employerId, user.id);

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('inbox')}
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">{te('employerMessagesSubtitleMobile')}</span>
            <span className="wa-hidden md:wa-block">{te('employerMessagesSubtitleDesktop')}</span>
          </>
        }
      />
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
        <EmployerMessagesInboxClient
          portalUserId={user.id}
          teamRow={teamRow}
          candidateRows={candidateRows}
          teamInitial={{
            thread: {
              id: thread.id,
              portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
            },
            messages: serializedMessages,
          }}
        />
      </div>
      <div className="wa-hidden md:wa-block">
        <EmployerMessagesInboxClient
          portalUserId={user.id}
          teamRow={teamRow}
          candidateRows={candidateRows}
          teamInitial={{
            thread: {
              id: thread.id,
              portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
            },
            messages: serializedMessages,
          }}
        />
      </div>
    </PortalPageFrame>
  );
}
