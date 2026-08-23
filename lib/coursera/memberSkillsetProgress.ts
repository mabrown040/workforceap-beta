import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { MEMBER_PROGRESS_CAP } from '@/lib/db/scanCaps';

export type MemberSkillsetProgressRow = {
  skillsetId: string;
  skillsetName: string;
  progressPct: number;
  programId: string;
  programSlug: string | null;
  lastSyncedAt: Date;
};

/**
 * Per-member skillset progress snapshots written by `/api/cron/coursera-sync`
 * every 6h. Returns an empty array when the cron has not run yet, when no
 * skillsets are configured, or when the table is unavailable in a fresh
 * environment that has not run `prisma migrate deploy`.
 */
export async function loadMemberSkillsetProgress(userId: string): Promise<MemberSkillsetProgressRow[]> {
  try {
    const rows = await prisma.courseraSkillsetProgress.findMany({
      take: MEMBER_PROGRESS_CAP,
      where: { userId },
      orderBy: [{ progressPct: 'desc' }, { skillsetName: 'asc' }],
      select: {
        skillsetId: true,
        skillsetName: true,
        progressPct: true,
        programId: true,
        programSlug: true,
        lastSyncedAt: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}
