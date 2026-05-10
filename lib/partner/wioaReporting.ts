/**
 * WIOA reporting metrics — single source of truth.
 *
 * All partner dashboards, admin exports, and grant reports should call
 * `generateWioaMetrics` so the numbers can never diverge.
 *
 * Definitions (all computed from canonical tables only):
 *   - enrolledCount: distinct members with a CourseEnrollment row
 *   - completedCount: distinct members with MemberProgramProgress.coursesCompleted > 0
 *   - placedCount: distinct members with a PlacementRecord in the date range
 *   - avgDaysToPlacement: average days from earliest enrollment to placement
 */

import { prisma } from '@/lib/db/prisma';

export type WioaMetrics = {
  enrolledCount: number;
  completedCount: number;
  placedCount: number;
  avgDaysToPlacement: number | null;
};

export async function generateWioaMetrics(
  partnerId: string,
  dateRange: { from: Date; to: Date },
): Promise<WioaMetrics> {
  // 1. Members referred by this partner (primary affiliation).
  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId },
    select: { memberId: true, referredAt: true },
  });

  // Also include members whose application lists this partner.
  const applicationRefs = await prisma.application.findMany({
    where: { referralPartnerId: partnerId },
    select: { userId: true },
  });

  const memberIds = new Set<string>();
  for (const r of referrals) memberIds.add(r.memberId);
  for (const a of applicationRefs) memberIds.add(a.userId);

  // 2. Of those, how many actually have a CourseEnrollment?
  if (memberIds.size === 0) {
    return { enrolledCount: 0, completedCount: 0, placedCount: 0, avgDaysToPlacement: null };
  }

  const enrolledRows = await prisma.courseEnrollment.findMany({
    where: {
      userId: { in: Array.from(memberIds) },
      enrolledAt: { gte: dateRange.from, lte: dateRange.to },
    },
    select: { userId: true },
  });
  const enrolledCount = new Set(enrolledRows.map((e) => e.userId)).size;

  // 3. Members who completed at least one program
  const completedRows = await prisma.memberProgramProgress.findMany({
    where: {
      userId: { in: Array.from(memberIds) },
      coursesCompleted: { gt: 0 },
    },
    select: { userId: true },
  });
  const completedCount = new Set(completedRows.map((r) => r.userId)).size;

  // 4. Members placed in the date range
  const placements = await prisma.placementRecord.findMany({
    where: {
      userId: { in: Array.from(memberIds) },
      placedAt: { gte: dateRange.from, lte: dateRange.to },
    },
    select: { userId: true, placedAt: true },
  });
  const placedCount = new Set(placements.map((p) => p.userId)).size;

  // 5. Average days from earliest enrollment to placement
  let avgDaysToPlacement: number | null = null;
  if (placements.length > 0) {
    const enrollmentDates = await prisma.courseEnrollment.findMany({
      where: {
        userId: { in: placements.map((p) => p.userId) },
      },
      select: { userId: true, enrolledAt: true },
      orderBy: { enrolledAt: 'asc' },
    });

    const earliestEnrollmentByUser = new Map<string, Date>();
    for (const e of enrollmentDates) {
      const existing = earliestEnrollmentByUser.get(e.userId);
      if (!existing || e.enrolledAt < existing) {
        earliestEnrollmentByUser.set(e.userId, e.enrolledAt);
      }
    }

    let totalDays = 0;
    let counted = 0;
    for (const p of placements) {
      const enrolledAt = earliestEnrollmentByUser.get(p.userId);
      if (enrolledAt) {
        const days = (p.placedAt.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          totalDays += days;
          counted++;
        }
      }
    }

    if (counted > 0) {
      avgDaysToPlacement = Math.round(totalDays / counted);
    }
  }

  return {
    enrolledCount,
    completedCount,
    placedCount,
    avgDaysToPlacement,
  };
}
