import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import PageHeader from '@/components/portal/PageHeader';
import MemberCounselorChatClient from '@/components/portal/MemberCounselorChatClient';
import MemberMessagesMobileClient from '@/components/portal/MemberMessagesMobileClient';
import { getTranslations } from 'next-intl/server';
import { MemberMessagesKit } from '@/components/portal/kit/pages/member/MemberMessagesKit';
import type { ChatMessage } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('messages');
  return buildPageMetadataAsync({
  title: t('messagesTitle'),
  description: t('messagesDescription'),
  path: '/dashboard/messages',
});
}

export default async function MemberMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ ui?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/messages');

  const params = await searchParams;
  const requestedUi = typeof params?.ui === 'string' ? params.ui : null;

  const t = await getTranslations('messages');

  const thread = await getOrCreateMemberCounselorThread(user.id);

  // If memberLastReadAt is null, the member has never explicitly read the thread.
  // Counting every message as unread is misleading and inflates the badge.
  // Treat null as "no unread" for the badge; the thread itself is still visible.
  const lastRead = thread.memberLastReadAt ? new Date(thread.memberLastReadAt) : null;

  const [latestMessages, counselor, unreadCount] = await Promise.all([
    prisma.message.findMany({
      take: 200,
      where: { threadId: thread.id, NOT: { body: { contains: '[ARCHIVED FIXTURE]' } } },
      orderBy: { createdAt: 'desc' },
    }),
    thread.counselorUserId
      ? prisma.user.findUnique({
          where: { id: thread.counselorUserId },
          select: { fullName: true },
        })
      : Promise.resolve(null),
    lastRead
      ? prisma.message.count({
          where: {
            threadId: thread.id,
            authorId: { not: user.id },
            createdAt: { gt: lastRead },
            NOT: { body: { contains: '[ARCHIVED FIXTURE]' } },
          },
        })
      : Promise.resolve(0),
  ]);

  const messages = [...latestMessages].reverse();
  const lastMsg = messages[messages.length - 1];
  const lastMsgText = lastMsg ? (lastMsg.body ?? '').slice(0, 60) : t('noMessagesYet');
  const lastMsgTime = lastMsg
    ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const counselorName = counselor?.fullName ?? null;
  const counselorInitials = counselorName
    ? counselorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CS';

  // ── New design-kit inbox (default). Opt out with ?ui=legacy. ──
  // Reuses the same real counselor thread + the existing legacy send endpoint
  // (`POST /api/member/messages`) that MemberCounselorChatClient posts to.
  if (requestedUi !== 'legacy') {
    const kitMessages: ChatMessage[] = messages.map((m) => {
      const mine = m.authorId === user.id;
      return {
        id: m.id,
        from: mine ? 'self' : 'other',
        text: m.body ?? '',
        ...(mine ? {} : { author: counselorInitials }),
      };
    });

    const activeName = counselorName ?? t('inbox');
    const conversations = [
      {
        id: thread.id,
        name: activeName,
        role: counselorName ? t('memberPortal') : t('inbox'),
        preview: lastMsgText,
        unread: unreadCount > 0,
        active: true,
      },
    ];

    return (
      <>
        <PageHeader
          title={t('inbox')}
          breadcrumbs={[{ label: t('memberPortal'), href: '/dashboard' }, { label: t('inbox') }]}
        />
        <MemberMessagesKit
          memberUserId={user.id}
          conversations={conversations}
          activeName={activeName}
          activeRole={counselorName ? 'Career Counselor' : 'Support'}
          activeInitials={counselorInitials}
          activeOnline={Boolean(thread.counselorUserId)}
          otherInitials={counselorInitials}
          messages={kitMessages}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('inbox')}
        breadcrumbs={[{ label: t('memberPortal'), href: '/dashboard' }, { label: t('inbox') }]}
      />

      {/* ── Mobile-only messages view (≤md) ── */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem', maxWidth: '100%', overflowX: 'hidden' }}>
        <MemberMessagesMobileClient
          initial={{
            memberUserId: user.id,
            counselorName,
            counselorInitials,
            thread: {
              id: thread.id,
              memberId: thread.memberId,
              counselorUserId: thread.counselorUserId,
              memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
              counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
            },
            messages: messages.map(serializeMessage),
            lastMsgText,
            lastMsgTime,
            unreadCount,
          }}
        />
      </div>

      {/* ── Desktop view ── */}
      <div className="wa-hidden md:wa-block">
        <MemberCounselorChatClient
          initial={{
            memberUserId: user.id,
            counselorName,
            thread: {
              id: thread.id,
              memberId: thread.memberId,
              counselorUserId: thread.counselorUserId,
              memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
              counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
            },
            messages: messages.map(serializeMessage),
          }}
        />
      </div>
    </>
  );
}
