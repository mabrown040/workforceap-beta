import { prisma } from './lib/db/prisma';

async function run() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'partner-test@workforceap.org',
          'employer-test@workforceap.org',
          'demo-partner@workforceap.org',
          'demo-employer@workforceap.org',
          'member.success@workforceap.org',
          'mbrown@hsconglomerates.com',
        ],
      },
    },
    select: { email: true, id: true, fullName: true },
  });

  const partners = await prisma.partner.findMany({
    where: {
      OR: [
        { name: 'Test Students' },
        { slug: { in: ['test-students', 'workforce-solutions-austin', 'austin-urban-league'] } },
      ],
    },
    select: { id: true, name: true, slug: true, active: true },
  });

  const employers = await prisma.employer.findMany({
    where: {
      OR: [
        { contactEmail: { in: ['employer-test@workforceap.org', 'demo-employer@workforceap.org'] } },
        { companyName: { contains: 'QA', mode: 'insensitive' } },
      ],
    },
    select: { id: true, companyName: true, contactEmail: true, status: true, userId: true },
  });

  console.log(JSON.stringify({ users, partners, employers }, null, 2));
}

run().finally(async () => {
  await prisma.$disconnect();
});
