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
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

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

  const serializedMessages = messages.map(serializeMessage);
  const last = serializedMessages[serializedMessages.length - 1] as { body?: string } | undefined;

  return (
    <PortalPageFrame>
      <>
        <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
          <PageHeader title="Messages" subtitle="Direct line to your WorkforceAP partnership team" />

          <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
            <div
              style={{
                background: 'var(--surface-container-lowest, #fff)',
                borderRadius: '0.875rem',
                border: '1px solid var(--color-border, #ebe7e7)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(28,27,27,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
                <div
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '9999px',
                    background: 'linear-gradient(135deg,var(--color-accent),var(--color-accent-dark))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: '#fff' }} aria-hidden="true">
                    support_agent
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>WorkforceAP Team</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {serializedMessages.length > 0 ? last?.body ?? 'No messages yet' : 'No messages yet — ask us anything'}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--outline-variant)', flexShrink: 0 }} aria-hidden="true">
                  chevron_right
                </span>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 1rem' }}>
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
          <MobileBottomNav variant="partner" />
        </div>

        <div className="wa-hidden wa-md:wa-block">
          <PageHeader
            title="Messages"
            subtitle="Direct line to your WorkforceAP partnership team — referrals, milestones, and resources."
          />
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
