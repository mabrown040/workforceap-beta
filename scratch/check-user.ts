
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const email = 'mabrown040@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: { profile: true, applications: true }
  });
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
