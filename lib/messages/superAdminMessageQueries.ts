import { Prisma } from '@prisma/client';
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

  const rows = await prisma.$queryRaw<
    {
      thread_id: string;
      member_last_at: Date | null;
      has_staff_after: boolean | null;
    }[]
  >(Prisma.sql`
    WITH member_last AS (
      SELECT m.thread_id, MAX(m.created_at) AS member_last_at
      FROM messages m
      INNER JOIN message_threads mt ON mt.id = m.thread_id
      WHERE m.thread_id IN (${Prisma.join(threadIds)})
        AND mt.kind = 'member'
        AND m.author_id = mt.member_id
      GROUP BY m.thread_id
    )
    SELECT
      mt.id AS thread_id,
      ml.member_last_at,
      EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.thread_id = mt.id
          AND m2.author_id <> mt.member_id
          AND m2.created_at > ml.member_last_at
      ) AS has_staff_after
    FROM message_threads mt
    INNER JOIN member_last ml ON ml.thread_id = mt.id
    WHERE mt.id IN (${Prisma.join(threadIds)})
  `);

  const now = Date.now();
  for (const r of rows) {
    const memberLastAt = r.member_last_at ? new Date(r.member_last_at) : null;
    if (!memberLastAt) continue;
    const hasStaffAfter = Boolean(r.has_staff_after);
    const needsCounselorReply = !hasStaffAfter;
    const ageMs = now - memberLastAt.getTime();
    map.set(r.thread_id, {
      threadId: r.thread_id,
      memberLastMessageAt: memberLastAt,
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

  const rows = await prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
    WITH member_last AS (
      SELECT m.thread_id, MAX(m.created_at) AS member_last_at
      FROM messages m
      INNER JOIN message_threads mt ON mt.id = m.thread_id
      WHERE mt.kind = 'member'
        AND m.author_id = mt.member_id
      GROUP BY m.thread_id
    )
    SELECT COUNT(*)::bigint AS count
    FROM message_threads mt
    INNER JOIN member_last ml ON ml.thread_id = mt.id
    WHERE ml.member_last_at < ${threshold}
      AND NOT EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.thread_id = mt.id
          AND m2.author_id <> mt.member_id
          AND m2.created_at > ml.member_last_at
      )
  `);
  return Number(rows[0]?.count ?? 0);
}

export async function countMessageThreadsWithActivity(): Promise<number> {
  return prisma.messageThread.count({
    where: { kind: 'member', messages: { some: {} } },
  });
}

/** Thread IDs where the latest member message has no staff reply after it and member message is older than `threshold`. */
export async function getThreadIdsBreachingSla(threshold: Date, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ thread_id: string }[]>(Prisma.sql`
    WITH member_last AS (
      SELECT m.thread_id, MAX(m.created_at) AS member_last_at
      FROM messages m
      INNER JOIN message_threads mt ON mt.id = m.thread_id
      WHERE mt.kind = 'member'
        AND m.author_id = mt.member_id
      GROUP BY m.thread_id
    )
    SELECT mt.id AS thread_id
    FROM message_threads mt
    INNER JOIN member_last ml ON ml.thread_id = mt.id
    INNER JOIN users u ON u.id = mt.member_id AND u.deleted_at IS NULL
    WHERE ml.member_last_at < ${threshold}
      AND EXISTS (SELECT 1 FROM messages mx WHERE mx.thread_id = mt.id)
      AND NOT EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.thread_id = mt.id
          AND m2.author_id <> mt.member_id
          AND m2.created_at > ml.member_last_at
      )
    ORDER BY ml.member_last_at ASC
    LIMIT ${limit}
  `);
  return rows.map((r) => r.thread_id);
}
