import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import EmployerMessagesInboxClient from '@/components/portal/EmployerMessagesInboxClient';
import { getOrCreateEmployerMessageThread } from '@/lib/messages/portalThreads';
import { serializeMessage } from '@/lib/messages/counselorThread';
import { buildEmployerInbox } from '@/lib/messages/employerInbox';
import { getTranslations } from 'next-intl/server';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

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

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());
  const thread = readOnlyAudit
    ? await prisma.messageThread.findUnique({ where: { employerId: ctx.employerId } })
    : await getOrCreateEmployerMessageThread(ctx.employerId);
  if (!thread) {
    return (
      <DesignSurface surface="dense" className="wa-p-6">
        {readOnlyAudit && <span hidden data-portal-audit-suppressed="employer-message-thread-provisioning" />}
        <div className="wa-space-y-6">
          <SectionHeader
            kicker="Employer messages"
            title="Inbox"
            goal="WorkforceAP support and every candidate conversation, in one place."
          />
          <div className="wa-kit-card">
            <h2 style={{ marginTop: 0 }}>No messages yet</h2>
            <p style={{ marginBottom: 0 }}>Your WorkforceAP team conversation will appear here after the first message.</p>
          </div>
        </div>
      </DesignSurface>
    );
  }
  if (readOnlyAudit) {
    return (
      <DesignSurface surface="dense" className="wa-p-6">
        <span hidden data-portal-audit-suppressed="employer-message-read-receipt-realtime-and-content" />
        <div className="wa-space-y-6">
          <SectionHeader
            kicker="Employer messages"
            title="Inbox"
            goal="WorkforceAP support and every candidate conversation, in one place."
          />
          <div className="wa-kit-card">
            Messaging access is available. Message content, read receipts, and realtime sync are paused for this audit.
          </div>
        </div>
      </DesignSurface>
    );
  }
  const messages = await prisma.message.findMany({
    take: 200,
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const serializedMessages = messages.map(serializeMessage);
  const { team: teamRow, candidates: candidateRows } = await buildEmployerInbox(ctx.employerId, user.id);

  return (
    <DesignSurface surface="dense" className="wa-p-6">
      <div className="wa-space-y-6" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <SectionHeader
          kicker="Employer messages"
          title="Inbox"
          goal="WorkforceAP support and every candidate conversation, in one place."
        />
        <div style={{ paddingBottom: '4rem' }}>
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
    </DesignSurface>
  );
}
