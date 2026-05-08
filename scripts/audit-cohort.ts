import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Andre Patterson', mode: 'insensitive' } },
        { fullName: { contains: 'Durell Coleman', mode: 'insensitive' } },
        { fullName: { contains: 'Shirtlet', mode: 'insensitive' } },
        { fullName: { contains: 'Sunny', mode: 'insensitive' } },
        { fullName: { contains: 'Karl Spencer', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      enrolledProgram: true,
      enrolledAt: true,
      createdAt: true,
      deletedAt: true,
      profile: {
        select: {
          profilePhone: true,
          profileAddress: true,
          dob: true,
          referralSource: true,
        },
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          programInterest: true,
          referralSource: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
