import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export async function logCronRun(
  workflowKey: string,
  result: Record<string, unknown>,
  status: 'ok' | 'error' = 'ok',
): Promise<void> {
  await prisma.workflowDiagnostic.create({
    data: {
      workflow: workflowKey,
      status,
      method: 'scheduled',
      summary: `Scheduled run: ${JSON.stringify(result).slice(0, 200)}`,
      metadata: result as Prisma.InputJsonValue,
    },
  }).catch(() => {});
}
