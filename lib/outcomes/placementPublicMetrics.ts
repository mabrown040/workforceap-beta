import type { PrismaClient } from '@prisma/client';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

export type PlacementPublicMetrics = {
  placedCount: number;
  /** Rows with any retention / follow-up signal recorded */
  withRetentionNote: number;
  lastPlacedAt: Date | null;
  asOfLabel: string;
};

/**
 * Aggregate placement counts for public trust surfaces (no per-member PII).
 */
export async function getPlacementPublicMetrics(prisma: PrismaClient): Promise<PlacementPublicMetrics> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return {
      placedCount: 0,
      withRetentionNote: 0,
      lastPlacedAt: null,
      asOfLabel: 'Build mode',
    };
  }

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const timeBound = { placedAt: { gte: twoYearsAgo } };

    const [placedCount, withRetentionNote, last] = await Promise.all([
      prisma.placementRecord.count({ where: timeBound }),
      prisma.placementRecord.count({
        where: {
          AND: [timeBound, { OR: [{ retentionStatus: { not: null } }, { retentionDecision: { not: null } }] }],
        },
      }),
      prisma.placementRecord.findFirst({
        where: timeBound,
        orderBy: { placedAt: 'desc' },
        select: { placedAt: true },
      }),
    ]);

    const lastPlacedAt = last?.placedAt ?? null;
    const asOfLabel = lastPlacedAt
      ? `Data as of ${lastPlacedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'No placements recorded yet in this system';

    return {
      placedCount,
      withRetentionNote,
      lastPlacedAt,
      asOfLabel,
    };
  } catch {
    return {
      placedCount: 0,
      withRetentionNote: 0,
      lastPlacedAt: null,
      asOfLabel: 'Outcomes data unavailable',
    };
  }
}
