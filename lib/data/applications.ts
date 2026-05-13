import { prisma } from '@/lib/db/prisma';

export async function getStaleApplications(daysOld: number = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.application.findMany({
    take: 5000,
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
