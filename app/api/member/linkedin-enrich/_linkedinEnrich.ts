import type { prisma } from '@/lib/db/prisma';

export const LINKEDIN_ENRICH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function buildLinkedInEnrichmentInputSummary(linkedinUrl: string) {
  return `LinkedIn enrichment: ${linkedinUrl}`;
}

export async function findRecentLinkedInEnrichment(
  tx: Pick<typeof prisma, 'aIToolResult'>,
  userId: string,
  linkedinUrl: string,
  now = new Date(),
) {
  return tx.aIToolResult.findFirst({
    where: {
      userId,
      toolType: 'skill_assessment',
      inputSummary: buildLinkedInEnrichmentInputSummary(linkedinUrl),
      createdAt: { gte: new Date(now.getTime() - LINKEDIN_ENRICH_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
}
