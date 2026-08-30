import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';
import { resolveAuthorizedPartnerMessageMember } from '@/lib/messages/contextSelection';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Messages',
    description: 'Message the WorkforceAP team.',
    path: '/partner/messages',
  });
}

const MESSAGES_SUBTITLE =
  'Direct line to your WorkforceAP partnership team — referrals, milestones, and resources.';

type Props = {
  searchParams?: Promise<{ memberId?: string | string[] }>;
};

export default async function PartnerMessagesPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/messages');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());
  const query = await searchParams;
  const [thread, permittedReferrals] = await Promise.all([
    readOnlyAudit
      ? prisma.messageThread.findUnique({ where: { partnerId: ctx.partnerId } })
      : getOrCreatePartnerMessageThread(ctx.partnerId),
    query?.memberId
      ? prisma.partnerReferral.findMany({
          take: 500,
          where: {
            partnerId: ctx.partnerId,
            partner: { organizationId: ctx.partner.organizationId },
            member: { organizationId: ctx.partner.organizationId, deletedAt: null },
          },
          select: { member: { select: { id: true, fullName: true } } },
          orderBy: { referredAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);
  const selectedMember = resolveAuthorizedPartnerMessageMember(
    permittedReferrals.map((referral) => referral.member),
    query?.memberId,
  );
  if (!thread) {
    return (
      <PortalPageFrame maxWidth="80rem">
        {readOnlyAudit && <span hidden data-portal-audit-suppressed="partner-message-thread-provisioning" />}
        <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6">
          <SectionHeader kicker="Partner Portal" title="Messages" goal={MESSAGES_SUBTITLE} />
          <div className="wa-kit-card">
            <h2 style={{ marginTop: 0 }}>No messages yet</h2>
            <p style={{ marginBottom: 0 }}>Your WorkforceAP partnership conversation will appear here after the first message.</p>
          </div>
        </DesignSurface>
      </PortalPageFrame>
    );
  }

  if (readOnlyAudit) {
    return (
      <PortalPageFrame maxWidth="80rem">
        <span hidden data-portal-audit-suppressed="partner-message-read-receipt-realtime-and-content" />
        <DesignSurface surface="dense" className="wa-flex wa-flex-col wa-gap-6">
          <SectionHeader kicker="Partner Portal" title="Messages" goal={MESSAGES_SUBTITLE} />
          <div className="wa-kit-card">
            Messaging access is available. Message content, read receipts, and realtime sync are paused for this audit.
          </div>
        </DesignSurface>
      </PortalPageFrame>
    );
  }

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

        <div className="wa-max-w-full wa-overflow-x-hidden wa-pb-24 md:wa-overflow-x-visible md:wa-pb-0">
          <div className="wa-mb-4 md:wa-hidden">
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
            key={`partner-chat-${selectedMember?.id ?? 'general'}`}
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
            contextLabel={selectedMember ? `Regarding ${selectedMember.fullName}` : undefined}
            initialDraft={selectedMember ? `Regarding ${selectedMember.fullName}: ` : undefined}
          />
        </div>
      </DesignSurface>
    </PortalPageFrame>
  );
}
