import { prisma } from '@/lib/db/prisma';
import { COUNSELOR_ROSTER_CAP } from '@/lib/db/queryCaps';

import { getRiskLevel } from '@/lib/member/atRiskScoring';

export type CounselorRosterRiskRow = {
  memberId: string;
  riskScore: number | null;
  riskLevel: ReturnType<typeof getRiskLevel>;
  lastActivityAt: Date;
};

/**
 * Open/acknowledged at-risk alerts (nightly cron) plus last MemberEvent activity
 * for counselor roster sorting and badges.
 */
export async function loadCounselorRosterRiskAndActivity(
  memberIds: string[],
): Promise<Map<string, CounselorRosterRiskRow>> {
  const result = new Map<string, CounselorRosterRiskRow>();
  if (memberIds.length === 0) return result;

  const [alerts, lastEvents, users] = await Promise.all([
    prisma.atRiskAlert.findMany({
      take: COUNSELOR_ROSTER_CAP,
      where: {
        userId: { in: memberIds },
        status: { in: ['open', 'acknowledged'] },
      },
      orderBy: { updatedAt: 'desc' },
      select: { userId: true, score: true },
    }),
    prisma.$queryRawUnsafe<Array<{ user_id: string; last_at: Date | null }>>(
      `SELECT user_id, MAX(created_at) AS last_at
       FROM member_events
       WHERE user_id = ANY($1::text[])
       GROUP BY user_id`,
      memberIds,
    ),
    prisma.user.findMany({
      take: COUNSELOR_ROSTER_CAP,
      where: { id: { in: memberIds } },
      select: { id: true, createdAt: true },
    }),
  ]);

  const scoreByUser = new Map<string, number>();
  for (const a of alerts) {
    if (!scoreByUser.has(a.userId)) scoreByUser.set(a.userId, a.score);
  }

  const lastEventByUser = new Map<string, Date>();
  for (const row of lastEvents) {
    if (row.last_at) lastEventByUser.set(row.user_id, row.last_at);
  }

  const createdByUser = new Map(users.map((u) => [u.id, u.createdAt]));

  for (const id of memberIds) {
    const riskScore = scoreByUser.get(id) ?? null;
    const riskLevel = riskScore != null ? getRiskLevel(riskScore) : 'LOW';
    const lastActivityAt = lastEventByUser.get(id) ?? createdByUser.get(id) ?? new Date();
    result.set(id, { memberId: id, riskScore, riskLevel, lastActivityAt });
  }

  return result;
}
