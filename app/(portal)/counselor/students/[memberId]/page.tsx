import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import Link from 'next/link';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';

type Props = { params: Promise<{ memberId: string }> };

export default async function CounselorStudentDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/students');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const { memberId } = await params;

  const [counselor, adminUser] = await Promise.all([
    prisma.counselor.findFirst({
      where: { userId: user.id, active: true },
    }),
    isAdmin(user.id),
  ]);
  if (!counselor && !adminUser) redirect('/dashboard');

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { id: true, fullName: true, email: true },
  });
  if (!member) notFound();

  if (counselor) {
    const assign = await prisma.counselorAssignment.findFirst({
      where: { counselorId: counselor.id, memberId, active: true },
    });
    if (!assign) notFound();
  } else if (!adminUser) {
    notFound();
  }

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });
  const authorIds = [...new Set(messages.map((m) => m.authorId))];
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, fullName: true } })
      : [];
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  return (
    <div className="portal-main-content">
      <Link href="/counselor/students" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        ← Back to students
      </Link>
      <PageHeader title={member.fullName} subtitle={member.email} />

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Messages</h2>
        <AdminMemberCounselorChatClient
          messagesApiBase={`/api/counselor/members/${member.id}/messages`}
          initial={{
            staffUserId: user.id,
            member: { id: member.id, fullName: member.fullName },
            thread: {
              id: thread.id,
              memberId: thread.memberId,
              counselorUserId: thread.counselorUserId,
              memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
              counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
            },
            messages: messages.map((m) => ({
              ...serializeMessage(m),
              authorName: nameById.get(m.authorId) ?? 'User',
            })),
          }}
        />
      </section>

      {adminUser ? (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          <Link href={`/admin/members/${member.id}`} className="btn btn-outline btn-sm">
            Open full member record (admin)
          </Link>
        </p>
      ) : null}
    </div>
  );
}
