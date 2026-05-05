import { prisma } from '@/lib/db/prisma';

/**
 * Check whether a cron job is enabled by reading the latest toggle entry
 * in WorkflowDiagnostic metadata. Defaults to true if no toggle record found.
 */
export async function isCronEnabled(workflowKey: string): Promise<boolean> {
  const latestToggle = await prisma.workflowDiagnostic.findFirst({
    where: {
      workflow: workflowKey,
      summary: { contains: 'toggled' },
    },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  if (!latestToggle) return true; // default: enabled if never toggled
  const meta = latestToggle.metadata as Record<string, unknown> | null;
  return meta?.enabled !== false;
}
