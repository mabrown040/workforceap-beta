import { prisma } from '@/lib/db/prisma';
import { WORK_QUEUE_CAP } from '@/lib/db/scanCaps';

export async function getStaleApplications(daysOld: number = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.application.findMany({
    take: WORK_QUEUE_CAP,
    where: {
      status: 'PENDING',
      user: { email: { notIn: ['member.success@workforceap.org', 'mbrown@hsconglomerates.com'] } },
      createdAt: {
        lt: cutoffDate,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
