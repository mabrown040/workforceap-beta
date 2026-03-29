import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import MemberCounselorChatClient from '@/components/portal/MemberCounselorChatClient';
import MemberMessagesMobileClient from '@/components/portal/MemberMessagesMobileClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Messages',
  description: 'Chat with your WorkforceAP counselor.',
  path: '/dashboard/messages',
});

export default async function MemberMessagesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/messages');

  const thread = await getOrCreateMemberCounselorThread(user.id);

  const [messages, counselor] = await Promise.all([
    prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    }),
    thread.counselorUserId
      ? prisma.user.findUnique({
          where: { id: thread.counselorUserId },
          select: { fullName: true },
        })
      : Promise.resolve(null),
  ]);

  const lastMsg = messages[messages.length - 1];
  const lastMsgText = lastMsg ? (lastMsg.body ?? '').slice(0, 60) : 'No messages yet';
  const lastMsgTime = lastMsg
    ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const unreadCount = messages.filter(
    (m) => m.authorId !== user.id
  ).length;

  const counselorName = counselor?.fullName ?? null;
  const counselorInitials = counselorName
    ? counselorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CS';

  return (
    <>
      {/* ── Mobile-only messages view (≤md) ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
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
        <MobileBottomNav variant="portal" />
      </div>

      {/* ── Desktop view ── */}
      <div className="wa-hidden wa-md:wa-block">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Messages</h1>
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
