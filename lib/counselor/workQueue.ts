import { prisma } from '@/lib/db/prisma';

/**
 * Counselor Work Queue
 *
 * Shows members whose latest thread message is from the member and has been
 * waiting >24h without a counselor reply. Sorted oldest first so the most
 * overdue rises to the top — Q2 product outcome (counselor SLA).
 *
 * Differs from the dashboard `getCounselorCommandCenter` "needsReply" block:
 *   - Threshold is 24h (not 48h SLA breach)
 *   - Returns ALL overdue rows, not just the top 5 preview
 *   - Used by a dedicated /counselor/queue page
 */

export type WorkQueueRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  threadId: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  hoursWaiting: number;
};

const HOUR_MS = 60 * 60 * 1000;
const QUEUE_THRESHOLD_HOURS = 24;

/**
 * Build the work queue for a counselor.
 *
 * @param counselorUserId — userId of the signed-in counselor
 * @param options.isAdmin — when true (and the user has no counselor row),
 *   include all enrolled members. Mirrors the dashboard's behaviour so
 *   super-admins / admins viewing the page can see everyone.
 */
export async function getCounselorWorkQueue(
  counselorUserId: string,
  options?: { isAdmin?: boolean },
): Promise<WorkQueueRow[]> {
  // Resolve member scope.
  let memberIds: string[] = [];
  if (options?.isAdmin) {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: counselorUserId, active: true },
      select: { id: true },
    });
    if (counselor) {
      const assignments = await prisma.counselorAssignment.findMany({
        take: 5000,
        where: { counselorId: counselor.id, active: true },
        select: { memberId: true },
      });
      memberIds = assignments.map((a) => a.memberId);
    } else {
      const allMembers = await prisma.user.findMany({
        where: { deletedAt: null, enrolledProgram: { not: null } },
        select: { id: true },
        take: 200,
      });
      memberIds = allMembers.map((m) => m.id);
    }
  } else {
    const counselor = await prisma.counselor.findFirst({
      where: { userId: counselorUserId, active: true },
      select: { id: true },
    });
    if (!counselor) return [];
    const assignments = await prisma.counselorAssignment.findMany({
      take: 5000,
      where: { counselorId: counselor.id, active: true },
      select: { memberId: true },
    });
    memberIds = assignments.map((a) => a.memberId);
  }
  if (memberIds.length === 0) return [];

  const threads = await prisma.messageThread.findMany({
    take: 5000,
    where: { memberId: { in: memberIds }, kind: 'member' },
    select: { id: true, memberId: true },
  });
  const threadIds = threads.map((t) => t.id);
  if (threadIds.length === 0) return [];
  const threadById = new Map(threads.map((t) => [t.id, t]));

  // Last message per thread + the member lookup are independent reads — run
  // them together. DISTINCT ON pushes "last message per thread" down to
  // Postgres on the existing (thread_id, created_at) index instead of
  // pulling every message body for the counselor's whole roster history and
  // keeping only the first row per thread in JS.
  const [lastMessageList, users] = await Promise.all([
    prisma.$queryRawUnsafe<
      Array<{ id: string; thread_id: string; author_id: string; body: string | null; created_at: Date }>
    >(
      `SELECT DISTINCT ON (thread_id) id, thread_id, author_id, body, created_at
       FROM messages
       WHERE thread_id = ANY($1::text[])
       ORDER BY thread_id, created_at DESC`,
      threadIds,
    ),
    prisma.user.findMany({
      take: 5000,
      where: { id: { in: memberIds } },
      select: { id: true, fullName: true, email: true },
    }),
  ]);

  const memberLookup = new Map<string, { id: string; fullName: string | null; email: string }>();
  for (const u of users) memberLookup.set(u.id, u);

  const now = new Date();
  const cutoff = now.getTime() - QUEUE_THRESHOLD_HOURS * HOUR_MS;
  const rows: WorkQueueRow[] = [];

  for (const lm of lastMessageList) {
    const thread = threadById.get(lm.thread_id);
    if (!thread?.memberId) continue;
    // Latest message must be from the member (not the counselor).
    if (lm.author_id !== thread.memberId) continue;
    // Must have been waiting longer than the threshold.
    if (lm.created_at.getTime() > cutoff) continue;
    const member = memberLookup.get(thread.memberId);
    if (!member) continue;

    const hoursWaiting = Math.max(
      QUEUE_THRESHOLD_HOURS,
      Math.round((now.getTime() - lm.created_at.getTime()) / HOUR_MS),
    );
    rows.push({
      memberId: member.id,
      memberName: member.fullName ?? member.email,
      memberEmail: member.email,
      threadId: lm.thread_id,
      lastMessageBody: lm.body ?? '',
      lastMessageAt: lm.created_at,
      hoursWaiting,
    });
  }

  // Oldest first — most overdue at the top.
  rows.sort((a, b) => a.lastMessageAt.getTime() - b.lastMessageAt.getTime());
  return rows;
}

/** Format an hours-waiting count as "Xd Yh ago" / "Xh ago". */
export function formatTimeWaiting(hours: number): string {
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours === 0) return `${days}d ago`;
  return `${days}d ${remHours}h ago`;
}

/** Truncate a message body for the queue preview. */
export function previewMessageBody(body: string, maxLen = 80): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}
