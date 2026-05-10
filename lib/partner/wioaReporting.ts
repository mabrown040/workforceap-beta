import prisma from "@/lib/db/prisma";

interface WioaMetrics {
  enrolledCount: number;
  completedCount: number;
  placedCount: number;
  avgDaysToPlacement: number | null;
}

/**
 * Generates WIOA performance metrics for a partner over a date range.
 * @param partnerId - The partner (e.g., WIOA provider) ID.
 * @param dateRange - Object with from and to ISO dates.
 * @returns Aggregated WIOA metrics.
 */
export async function generateWioaMetrics(
  partnerId: string,
  dateRange: { from: string; to: string }
): Promise<WioaMetrics> {
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);

  // Enrolled: members linked to this partner who enrolled in the period
  const enrolledCount = await prisma.member.count({
    where: {
      partnerId,
      enrolledAt: { gte: fromDate, lte: toDate },
    },
  });

  // Completed: members who completed a program in the period
  const completedCount = await prisma.member.count({
    where: {
      partnerId,
      completedAt: { gte: fromDate, lte: toDate },
    },
  });

  // Placed: members placed in a job in the period
  const placements = await prisma.placement.findMany({
    where: {
      partnerId,
      placedAt: { gte: fromDate, lte: toDate },
    },
    include: { member: true },
  });
  const placedCount = placements.length;

  // Average days from enrollment to placement
  let avgDaysToPlacement: number | null = null;
  if (placedCount > 0) {
    const totalDays = placements.reduce((sum, p) => {
      const enrolled = p.member?.enrolledAt;
      const placed = p.placedAt;
      if (enrolled && placed) {
        return sum + (placed.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24);
      }
      return sum;
    }, 0);
    avgDaysToPlacement = Math.round(totalDays / placedCount);
  }

  return { enrolledCount, completedCount, placedCount, avgDaysToPlacement };
}
