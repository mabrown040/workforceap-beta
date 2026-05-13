import { prisma } from '@/lib/db/prisma';

const HOURS_48_MS = 48 * 60 * 60 * 1000;
const HOURS_72_MS = 72 * 60 * 60 * 1000;

export type ThreadSlaRow = {
  threadId: string;
  memberLastMessageAt: Date | null;
  needsCounselorReply: boolean;
  breached48h: boolean;
  breached72h: boolean;
};

/**
 * For each thread: if the latest message from the member has no later counselor/staff message,
 * the thread "needs" a counselor reply. SLA breach when that member message is older than 48h / 72h.
 */
export async function getSlaStatusForThreads(threadIds: string[]): Promise<Map<string, ThreadSlaRow>> {
  const map = new Map<string, ThreadSlaRow>();
  if (threadIds.length === 0) return map;

  const threads = await prisma.messageThread.findMany({
    take: 500,
    where: {
      id: { in: threadIds },
      kind: 'member',
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const now = Date.now();
  for (const thread of threads) {
    if (!thread.memberId) continue;

    const memberMessages = thread.messages.filter(m => m.authorId === thread.memberId);
    if (memberMessages.length === 0) continue;

    const latestMemberMessage = memberMessages[0];

    const hasStaffAfter = thread.messages.some(m =>
      m.authorId !== thread.memberId &&
      m.createdAt > latestMemberMessage.createdAt
    );

    const needsCounselorReply = !hasStaffAfter;
    const ageMs = now - latestMemberMessage.createdAt.getTime();

    map.set(thread.id, {
      threadId: thread.id,
      memberLastMessageAt: latestMemberMessage.createdAt,
      needsCounselorReply,
      breached48h: needsCounselorReply && ageMs >= HOURS_48_MS,
      breached72h: needsCounselorReply && ageMs >= HOURS_72_MS,
    });
  }

  return map;
}

export async function countThreadsWithSlaBreach(minHours: 48 | 72): Promise<number> {
  const thresholdMs = minHours === 48 ? HOURS_48_MS : HOURS_72_MS;
  const threshold = new Date(Date.now() - thresholdMs);

  const threads = await prisma.messageThread.findMany({
    take: 500,
    where: {
      kind: 'member',
      messages: {
        some: {
          createdAt: { lt: threshold }
        }
      }
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  let count = 0;
  for (const thread of threads) {
    if (!thread.memberId) continue;

    const memberMessages = thread.messages.filter(m => m.authorId === thread.memberId);
    if (memberMessages.length === 0) continue;

    const latestMemberMessage = memberMessages[0];

    if (latestMemberMessage.createdAt >= threshold) continue;

    const hasStaffAfter = thread.messages.some(m =>
      m.authorId !== thread.memberId &&
      m.createdAt > latestMemberMessage.createdAt
    );

    if (!hasStaffAfter) {
      count++;
    }
  }

  return count;
}

export async function countMessageThreadsWithActivity(): Promise<number> {
  return prisma.messageThread.count({
    where: { kind: 'member', messages: { some: {} } },
  });
}

/** Thread IDs where the latest member message has no staff reply after it and member message is older than `threshold`. */
export async function getThreadIdsBreachingSla(threshold: Date, limit: number): Promise<string[]> {
  const threads = await prisma.messageThread.findMany({
    take: 500,
    where: {
      kind: 'member',
      messages: {
        some: {
          createdAt: { lt: threshold }
        }
      },
      member: {
        deletedAt: null
      }
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const breachingThreads = [];

  for (const thread of threads) {
    if (!thread.memberId) continue;

    const memberMessages = thread.messages.filter(m => m.authorId === thread.memberId);
    if (memberMessages.length === 0) continue;

    const latestMemberMessage = memberMessages[0];

    if (latestMemberMessage.createdAt >= threshold) continue;

    const hasStaffAfter = thread.messages.some(m =>
      m.authorId !== thread.memberId &&
      m.createdAt > latestMemberMessage.createdAt
    );

    if (!hasStaffAfter) {
      breachingThreads.push({
        threadId: thread.id,
        memberLastAt: latestMemberMessage.createdAt,
      });
    }
  }

  breachingThreads.sort((a, b) => a.memberLastAt.getTime() - b.memberLastAt.getTime());

  return breachingThreads.slice(0, limit).map(t => t.threadId);
}
