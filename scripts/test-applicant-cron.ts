import { prisma } from '../lib/db/prisma';

async function main() {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const staleApplications = await prisma.application.findMany({
    where: {
      status: 'PENDING',
      submittedAt: { lte: threeDaysAgo },
      user: { deletedAt: null, notificationsReminders: true },
    },
  });
  console.log(`Found ${staleApplications.length} stale applications.`);
}
main();
