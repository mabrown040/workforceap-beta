import { prisma } from '@/lib/db/prisma';
import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';

export type CounselorInboxRow = {
  memberId: string;
  memberName: string;
  threadId: string;
  programSubtitle: string;
  preview: string;
  timeLabel: string;
  sortAt: string;
  unreadCount: number;
};

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function buildCounselorInboxRows(
  memberIds: string[]
): Promise<CounselorInboxRow[]> {
  if (memberIds.length === 0) return [];

  const members = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true,
      fullName: true,
      enrolledProgram: true,
      programInterest: true,
    },
  });
  const memberById = new Map(members.map((m) => [m.id, m]));

  const rows: CounselorInboxRow[] = [];

  for (const memberId of memberIds) {
    const m = memberById.get(memberId);
    if (!m) continue;

    const thread = await getOrCreateMemberCounselorThread(memberId);
    const [lastMsg] = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const unreadCount = await prisma.message.count({
      where: {
        threadId: thread.id,
        authorId: memberId,
        ...(thread.counselorLastReadAt
          ? { createdAt: { gt: thread.counselorLastReadAt } }
          : {}),
      },
    });

    const program = m.enrolledProgram ?? m.programInterest ?? '—';
    const sortAt = lastMsg?.createdAt ?? thread.createdAt;
    const preview =
      lastMsg?.body?.slice(0, 100) ?? 'Tap to open conversation';

    rows.push({
      memberId,
      memberName: m.fullName ?? 'Member',
      threadId: thread.id,
      programSubtitle: program,
      preview,
      timeLabel: formatTimeLabel(sortAt.toISOString()),
      sortAt: sortAt.toISOString(),
      unreadCount,
    });
  }

  rows.sort((a, b) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0));

  return rows;
}
