import type { PrismaClient } from '@prisma/client';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

export type ProgramPlacementRow = { programSlug: string | null; count: number };
export type FundingPlacementRow = { fundingSource: string | null; count: number };
export type RetentionPlacementRow = { retentionStatus: string | null; count: number };

export type PublicOutcomesBundle = {
  totalPlaced: number;
  withRetentionNote: number;
  lastPlacedAt: Date | null;
  asOfLabel: string;
  byProgram: ProgramPlacementRow[];
  byFunding: FundingPlacementRow[];
  byRetentionStatus: RetentionPlacementRow[];
};

export async function getPublicPlacementOutcomes(prisma: PrismaClient): Promise<PublicOutcomesBundle> {
  if (shouldSkipOptionalDbQueriesAtBuild()) {
    return {
      totalPlaced: 0,
      withRetentionNote: 0,
      lastPlacedAt: null,
      asOfLabel: 'Build mode',
      byProgram: [],
      byFunding: [],
      byRetentionStatus: [],
    };
  }

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const timeBound = { placedAt: { gte: twoYearsAgo } };

    const [totalPlaced, withRetentionNote, last, byProgramRaw, byFundingRaw, byRetentionRaw] = await Promise.all([
      prisma.placementRecord.count({ where: timeBound }),
      prisma.placementRecord.count({
        where: { AND: [timeBound, { OR: [{ retentionStatus: { not: null } }, { retentionDecision: { not: null } }] }] },
      }),
      prisma.placementRecord.findFirst({ where: timeBound, orderBy: { placedAt: 'desc' }, select: { placedAt: true } }),
      prisma.placementRecord.groupBy({ by: ['programSlug'], where: timeBound, _count: { _all: true } }),
      prisma.placementRecord.groupBy({ by: ['fundingSource'], where: timeBound, _count: { _all: true } }),
      prisma.placementRecord.groupBy({ by: ['retentionStatus'], where: timeBound, _count: { _all: true } }),
    ]);

    const lastPlacedAt = last?.placedAt ?? null;
    const asOfLabel = lastPlacedAt
      ? `Data as of ${lastPlacedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : 'No placements recorded yet in this system';

    return {
      totalPlaced,
      withRetentionNote,
      lastPlacedAt,
      asOfLabel,
      byProgram: byProgramRaw.map((r) => ({ programSlug: r.programSlug, count: r._count._all })),
      byFunding: byFundingRaw.map((r) => ({ fundingSource: r.fundingSource, count: r._count._all })),
      byRetentionStatus: byRetentionRaw.map((r) => ({ retentionStatus: r.retentionStatus, count: r._count._all })),
    };
  } catch {
    return {
      totalPlaced: 0,
      withRetentionNote: 0,
      lastPlacedAt: null,
      asOfLabel: 'Outcomes data unavailable',
      byProgram: [],
      byFunding: [],
      byRetentionStatus: [],
    };
  }
}

/** Wilson score interval for proportion (public transparency). */
export function wilsonInterval(successes: number, trials: number, z = 1.96): { low: number; high: number; center: number } {
  if (trials <= 0) return { low: 0, high: 0, center: 0 };
  const phat = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = (phat + z2 / (2 * trials)) / denom;
  const margin =
    (z / denom) * Math.sqrt((phat * (1 - phat) + z2 / (4 * trials)) / trials);
  return {
    center: phat,
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}
