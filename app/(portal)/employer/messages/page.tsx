import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerMessagesInboxClient from '@/components/portal/EmployerMessagesInboxClient';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import { buildEmployerInbox } from '@/lib/messages/employerInbox';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Message candidates and the WorkforceAP team.',
  path: '/employer/messages',
});

export default async function EmployerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/messages');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const serializedMessages = messages.map(serializeMessage);
  const { team: teamRow, candidates: candidateRows } = await buildEmployerInbox(ctx.employerId, user.id);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Messages"
        subtitle={
          <>
            <span className="wa-block md:wa-hidden">Candidates and WorkforceAP team</span>
            <span className="wa-hidden md:wa-block">Chat with applicants, candidates, and the WorkforceAP team about jobs and hiring.</span>
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
