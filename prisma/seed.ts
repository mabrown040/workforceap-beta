import { PrismaClient } from '@prisma/client';

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
