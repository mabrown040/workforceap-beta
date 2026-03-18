import { PrismaClient } from '@prisma/client';
import { seedBlogPosts } from './seed-blog';

const prisma = new PrismaClient();

async function main() {
  const roles = ['member', 'admin', 'case_manager'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log('Seeded roles:', roles);

  // Seed admin users
  const adminEmails = ['mabrown040@gmail.com', 'michael.brown@workforceap.org'];
  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (user?.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { role: 'admin' },
      });
      console.log('Set role=admin for', email);
    }
  }

  await seedBlogPosts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
