import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const now = new Date();
const start = new Date(now);
start.setDate(now.getDate() - 14);
start.setHours(0, 0, 0, 0);

(async () => {
  const ai = await prisma.aIToolResult.groupBy({
    by: ['toolType'],
    where: { createdAt: { gte: start } },
    _count: { _all: true },
  });
  const events = await prisma.memberEvent.groupBy({
    by: ['eventName'],
    where: { createdAt: { gte: start }, eventName: { startsWith: 'ai_tool' } },
    _count: { _all: true },
  });
  console.log(JSON.stringify({ ai, events }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
