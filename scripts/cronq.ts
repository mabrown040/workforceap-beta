import { PrismaClient } from '@prisma/client';
const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
const p = new PrismaClient({ datasources: { db: { url } } });
async function main() {
  const since = new Date(Date.now() - 7*24*60*60*1000);
  const errs = await p.workflowDiagnostic.findMany({
    where: { status: { in: ['error','errored'] }, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { workflow: true, status: true, summary: true, createdAt: true, metadata: true },
  });
  console.log('Total errors:', errs.length);
  for (const e of errs) {
    console.log('---');
    console.log(e.createdAt.toISOString(), e.workflow, e.status);
    console.log('summary:', e.summary);
    console.log('meta:', JSON.stringify(e.metadata).slice(0, 500));
  }
}
main().catch(e=>{console.error('ERR:', e.message);}).finally(() => p.$disconnect());
