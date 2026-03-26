import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import PageHeader from '@/components/portal/PageHeader';
import CounselorMemberChatClient from '@/components/portal/CounselorMemberChatClient';
import '@/css/counselor.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Student',
  description: 'Counselor view of assigned student.',
  path: '/counselor/students',
});

export default async function CounselorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor');

  const canAccess = await isCounselor(user.id);
  if (!canAccess) redirect('/dashboard');

  const { id: memberId } = await params;

  const assignment = await prisma.counselorAssignment.findFirst({
    where: {
      memberId,
      active: true,
      counselor: { userId: user.id, active: true },
    },
    select: { id: true },
  });
  if (!assignment) redirect('/counselor');

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      programInterest: true,
      enrolledProgram: true,
    },
  });
  if (!member) notFound();

  const chatThread = await getOrCreateMemberCounselorThread(member.id);
  const chatMsgs = await prisma.message.findMany({
    where: { threadId: chatThread.id },
    orderBy: { createdAt: 'asc' },
  });
  const chatAuthorIds = [...new Set(chatMsgs.map((m) => m.authorId))];
  const chatAuthors =
    chatAuthorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: chatAuthorIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const chatNameById = new Map(chatAuthors.map((n) => [n.id, n.fullName]));

  const counselorChatInitial = {
    staffUserId: user.id,
    member: { id: member.id, fullName: member.fullName },
    thread: {
      id: chatThread.id,
      memberId: chatThread.memberId,
      counselorUserId: chatThread.counselorUserId,
      memberLastReadAt: chatThread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: chatThread.counselorLastReadAt?.toISOString() ?? null,
    },
    messages: chatMsgs.map((m) => ({
      ...serializeMessage(m),
      authorName: chatNameById.get(m.authorId) ?? 'User',
    })),
  };

  return (
    <div className="portal-main-content">
      <PageHeader
        title={member.fullName}
        subtitle={member.email}
        action={
          <Link href="/counselor" className="btn btn-outline">
            ← Back to students
          </Link>
        }
      />

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
          <p>
            <strong>Program interest:</strong> {member.programInterest || '—'}
          </p>
          <p>
            <strong>Enrolled program:</strong> {member.enrolledProgram || '—'}
          </p>
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Messages</h2>
          <CounselorMemberChatClient initial={counselorChatInitial} />
        </section>
      </div>
    </div>
  );
}
