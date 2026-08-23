import { prisma } from '@/lib/db/prisma';

export const COURSERA_SYNC_MEMBER_PAGE_SIZE = 100;

/** Hard cap per cron run so 6h skillset sync cannot page the entire user table. */
export const COURSERA_SYNC_MEMBER_CAP = 500;

export type CourseraSyncMember = {
  id: string;
  email: string;
  enrolledProgram: string | null;
};

const eligibleMemberWhere = {
  deletedAt: null,
  email: { not: '' },
  OR: [{ profile: { is: null } }, { profile: { role: { in: ['member', 'admin', 'super_admin'] } } }],
};

export async function fetchEligibleCourseraMembers(): Promise<CourseraSyncMember[]> {
  const members: CourseraSyncMember[] = [];

  for (let skip = 0; skip < COURSERA_SYNC_MEMBER_CAP; skip += COURSERA_SYNC_MEMBER_PAGE_SIZE) {
    const take = Math.min(COURSERA_SYNC_MEMBER_PAGE_SIZE, COURSERA_SYNC_MEMBER_CAP - skip);
    const page = await prisma.$transaction((tx) =>
      tx.user.findMany({
        where: eligibleMemberWhere,
        select: { id: true, email: true, enrolledProgram: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
    );
    members.push(...page);
    if (page.length < take) break;
  }

  return members;
}
