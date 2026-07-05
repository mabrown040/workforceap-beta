/**
 * WIOA monthly report generator.
 *
 * Computes active members, completers, placements, and average wage by program
 * for a given date range. Called by /api/cron/wioa-report and
 * /api/admin/reports/wioa/generate.
 */

import { prisma } from '@/lib/db/prisma';

export type WioaReportProgram = {
  programSlug: string;
  activeMembers: number;
  completers: number;
  placements: number;
  avgWage: number | null;
};

export type WioaReport = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalActiveMembers: number;
  totalCompleters: number;
  totalPlacements: number;
  overallAvgWage: number | null;
  programs: WioaReportProgram[];
  rawJson: Record<string, unknown>;
};

function getPreviousMonthRange(now = new Date()): { start: Date; end: Date } {
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function generateWioaReport(
  period?: { start: Date; end: Date },
): Promise<WioaReport> {
  const { start, end } = period ?? getPreviousMonthRange();
  const dateRange = { gte: start, lte: end };

  const totalActiveMembers = await prisma.user.count({
    where: { deletedAt: null, createdAt: dateRange },
  });

  const completers = await prisma.courseProgress.groupBy({
    by: ['userId'],
    where: { status: 'COMPLETED', lastUpdatedAt: dateRange },
    _count: { userId: true },
  });
  const totalCompleters = completers.length;

  // Only staff-verified placements count toward the reported totals — an
  // employer marking someone "hired" auto-creates an unverified record.
  const verifiedInRange = { placedAt: dateRange, startDateVerified: true } as const;

  const totalPlacements = await prisma.placementRecord.count({
    where: verifiedInRange,
  });

  const overallAvgWageAgg = await prisma.placementRecord.aggregate({
    where: verifiedInRange,
    _avg: { salaryOffered: true },
  });
  const overallAvgWage = overallAvgWageAgg._avg.salaryOffered ?? null;

  // Enrollments by program in the period
  const enrollmentsByProgram = await prisma.courseEnrollment.groupBy({
    by: ['programSlug'],
    where: { enrolledAt: dateRange },
    _count: { programSlug: true },
  });

  // Completers by program in the period
  const completersByProgram = await prisma.courseProgress.groupBy({
    by: ['programSlug'],
    where: { status: 'COMPLETED', lastUpdatedAt: dateRange },
    _count: { programSlug: true },
  });

  // Placements by program in the period
  const placementsByProgram = await prisma.placementRecord.groupBy({
    by: ['programSlug'],
    where: verifiedInRange,
    _count: { programSlug: true },
  });

  // Avg wage by program in the period
  const wageByProgram = await prisma.placementRecord.groupBy({
    by: ['programSlug'],
    where: verifiedInRange,
    _avg: { salaryOffered: true },
  });

  const programSlugs = new Set([
    ...enrollmentsByProgram.map((e) => e.programSlug),
    ...completersByProgram.map((c) => c.programSlug),
    ...placementsByProgram.map((p) => p.programSlug),
  ]);

  const programs: WioaReportProgram[] = Array.from(programSlugs)
    .filter((s): s is string => s !== null)
    .sort()
    .map((programSlug) => ({
      programSlug,
      activeMembers: (enrollmentsByProgram.find((e) => e.programSlug === programSlug)?._count as { programSlug?: number } | undefined)?.programSlug ?? 0,
      completers: (completersByProgram.find((c) => c.programSlug === programSlug)?._count as { programSlug?: number } | undefined)?.programSlug ?? 0,
      placements: (placementsByProgram.find((p) => p.programSlug === programSlug)?._count as { programSlug?: number } | undefined)?.programSlug ?? 0,
      avgWage: wageByProgram.find((w) => w.programSlug === programSlug)?._avg?.salaryOffered ?? null,
    }));

  const report: WioaReport = {
    generatedAt: new Date().toISOString(),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalActiveMembers,
    totalCompleters,
    totalPlacements,
    overallAvgWage,
    programs,
    rawJson: {},
  };

  report.rawJson = JSON.parse(JSON.stringify(report));
  return report;
}
