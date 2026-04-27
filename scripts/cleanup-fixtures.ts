import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting fixture cleanup...');

  // 1. Delete messages containing [ARCHIVED FIXTURE]
  const deletedMessages = await prisma.message.deleteMany({
    where: {
      body: {
        contains: '[ARCHIVED FIXTURE]',
      },
    },
  });
  console.log(`Deleted ${deletedMessages.count} fixture messages.`);

  // 2. Delete test users (member.success@workforceap.org, mbrown@hsconglomerates.com)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        in: ['member.success@workforceap.org', 'mbrown@hsconglomerates.com'],
      },
    },
  });
  console.log(`Deleted ${deletedUsers.count} test users.`);

  // 3. Delete partner named "Test Students"
  const deletedPartners = await prisma.partner.deleteMany({
    where: {
      name: 'Test Students',
    },
  });
  console.log(`Deleted ${deletedPartners.count} test partners.`);

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
