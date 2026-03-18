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

  const adminEmail = 'mabrown040@gmail.com';
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail }, include: { profile: true } });
  if (adminUser?.profile) {
    await prisma.profile.update({
      where: { userId: adminUser.id },
      data: { role: 'admin' },
    });
    console.log('Set role=admin for', adminEmail);
  }

  await seedBlogPosts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
