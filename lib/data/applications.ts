import { prisma } from '@/lib/db/prisma';

export async function getStaleApplications(daysOld: number = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return prisma.application.findMany({
    where: {
      status: 'PENDING',
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
