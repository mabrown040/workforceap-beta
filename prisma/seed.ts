import { PrismaClient } from '@prisma/client';
import { seedBlogPosts } from './seed-blog';

const prisma = new PrismaClient();

async function main() {
  const roles = ['member', 'admin', 'case_manager', 'counselor', 'partner'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  console.log('Seeded roles:', roles);

  // Seed admin users (mabrown040 is super_admin for testing all portal views)
  const superAdminEmails = ['mabrown040@gmail.com'];
  for (const email of superAdminEmails) {
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (user?.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { role: 'super_admin' },
      });
      console.log('Set role=super_admin for', email);
    }
  }
  const adminEmails = ['michael.brown@workforceap.org'];
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
  // Seed initial partners
  const partnerSeeds = [
    { name: 'Workforce Solutions Capital Area', slug: 'workforce-solutions-austin', contactEmail: null },
    { name: 'Texas Workforce Commission', slug: 'twc', contactEmail: null },
    { name: 'Austin Area Urban League', slug: 'austin-urban-league', contactEmail: null },
    { name: 'African American Youth Harvest Foundation', slug: 'aayh-foundation', contactEmail: null },
    { name: '211 Texas', slug: '211-texas', contactEmail: null },
  ];
  for (const p of partnerSeeds) {
    await prisma.partner.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  console.log('Seeded partners:', partnerSeeds.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


