import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import MemberCounselorChatClient from '@/components/portal/MemberCounselorChatClient';
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
    (m) => m.senderRole === 'counselor' &&
      thread.memberLastReadAt &&
      new Date(m.createdAt) > new Date(thread.memberLastReadAt)
  ).length;

  return (
    <>
      {/* ── Mobile-only messages view (≤640px) ── */}
      <div className="md:hidden pb-24">
        {/* Header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 w-full"
          style={{ background: 'rgba(252,249,248,0.88)', backdropFilter: 'blur(12px)' }}
        >
          <h1 className="text-[#ad2c4d] font-bold text-xl tracking-tight">Messages</h1>
          <span className="material-symbols-outlined text-[#ad2c4d]">edit_square</span>
        </header>

        {/* Search */}
        <div className="px-6 py-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#584144] text-sm">search</span>
            <input
              type="text"
              placeholder="Search conversations"
              className="w-full pl-10 pr-3 py-3 bg-[#f2eeed] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8c0f37]/40 placeholder:text-[#584144]/60"
              readOnly
            />
          </div>
        </div>

        {/* Thread list */}
        <main className="px-4 space-y-1">
          {/* Counselor thread */}
          <div className="bg-[#f2eeed] rounded-xl px-4 py-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#ad2c4d] flex items-center justify-center text-white font-bold text-sm tracking-tight">
                {counselor?.fullName ? counselor.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'CS'}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#7b5800] rounded-full border-2 border-[#f2eeed]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="font-bold text-[15px] text-[#1c1b1b]">{counselor?.fullName ?? 'Your Counselor'}</h3>
                <span className="text-[11px] font-medium text-[#8c0f37] uppercase tracking-wider">{lastMsgTime}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-sm text-[#1c1b1b] font-medium truncate">{lastMsgText}</p>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 bg-[#ad2c4d] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Program team placeholder */}
          <div className="bg-[#fcf9f8] rounded-xl px-4 py-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 rounded-full bg-[#f2eeed] flex items-center justify-center text-[#584144] font-bold text-sm flex-shrink-0">PT</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="font-bold text-[15px] text-[#1c1b1b]">Program Team</h3>
              </div>
              <p className="text-sm text-[#584144] truncate">Welcome to WorkforceAP! Check in anytime.</p>
            </div>
          </div>
        </main>
      </div>

      {/* ── Desktop view ── */}
      <div className="hidden md:block">
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

      <MobileBottomNav />
    </>
  );
}
