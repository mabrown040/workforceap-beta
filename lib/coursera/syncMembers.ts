import { prisma } from '@/lib/db/prisma';

export const COURSERA_SYNC_MEMBER_PAGE_SIZE = 100;

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

  for (let skip = 0; ; skip += COURSERA_SYNC_MEMBER_PAGE_SIZE) {
    const page = await prisma.user.findMany({
      where: eligibleMemberWhere,
      select: { id: true, email: true, enrolledProgram: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take: COURSERA_SYNC_MEMBER_PAGE_SIZE,
    });
    members.push(...page);
    if (page.length < COURSERA_SYNC_MEMBER_PAGE_SIZE) break;
  }

  return members;
}
