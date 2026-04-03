import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerMessagesInboxClient from '@/components/portal/EmployerMessagesInboxClient';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import { buildEmployerInbox } from '@/lib/messages/employerInbox';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Message candidates and the WorkforceAP team.',
  path: '/employer/messages',
});

export default async function EmployerMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/messages');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const serializedMessages = messages.map(serializeMessage);
  const { team: teamRow, candidates: candidateRows } = await buildEmployerInbox(ctx.employerId, user.id);

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
        <div style={{ padding: '1rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Messages</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            Candidates and WorkforceAP team
          </p>
        </div>
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
        <MobileBottomNav variant="employer" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <div>
          <PageHeader
            title="Messages"
            subtitle="Chat with applicants, candidates, and the WorkforceAP team about jobs and hiring."
          />
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
      </div>
    </>
  );
}
