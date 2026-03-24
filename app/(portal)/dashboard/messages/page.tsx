import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import MemberCounselorChatClient from '@/components/portal/MemberCounselorChatClient';

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

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Messages</h1>
      <MemberCounselorChatClient
        initial={{
          memberUserId: user.id,
          counselorName: counselor?.fullName ?? null,
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
  );
}
