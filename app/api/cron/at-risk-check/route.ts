import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { calculateAllAtRiskScores, persistAtRiskAlert } from '@/lib/member/atRiskScoring';
import { THRESHOLDS } from '@/lib/member/atRiskScoring';

/**
 * Nightly at-risk check — run via cron at 6 AM.
 * Scores all active members, persists alerts, sends counselor digests.
 */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    const scores = await calculateAllAtRiskScores();

    // Persist alerts for high-risk members
    const highRiskCount = scores.filter((s) => s.score >= THRESHOLDS.HIGH).length;
    const criticalCount = scores.filter((s) => s.score >= THRESHOLDS.CRITICAL).length;

    for (const score of scores.filter((s) => s.score >= THRESHOLDS.MEDIUM)) {
      await persistAtRiskAlert(score);
    }

    // Resolve alerts for members whose score dropped below medium
    const activeAlertUserIds = new Set(
      scores.filter((s) => s.score >= THRESHOLDS.MEDIUM).map((s) => s.userId)
    );
    
    const staleAlerts = await prisma.atRiskAlert.findMany({
      where: {
        status: { in: ['open', 'acknowledged'] },
        userId: { notIn: Array.from(activeAlertUserIds) },
      },
      select: { id: true },
    });

    if (staleAlerts.length > 0) {
      await prisma.atRiskAlert.updateMany({
        where: {
          id: { in: staleAlerts.map((a) => a.id) },
        },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });
    }

    // Build counselor digest
    const criticalMembers = scores.filter((s) => s.score >= THRESHOLDS.CRITICAL).slice(0, 10);
    const highMembers = scores
      .filter((s) => s.score >= THRESHOLDS.HIGH && s.score < THRESHOLDS.CRITICAL)
      .slice(0, 20);

    // TODO: Send notification to counselors via existing notification system
    // For now, log and store for admin dashboard
    console.log(`[at-risk-check] Scored ${scores.length} members. Critical: ${criticalCount}, High: ${highRiskCount - criticalCount}`);

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      scored: scores.length,
      critical: criticalCount,
      high: highRiskCount - criticalCount,
      medium: scores.filter((s) => s.score >= THRESHOLDS.MEDIUM && s.score < THRESHOLDS.HIGH).length,
      alertsCreated: scores.filter((s) => s.score >= THRESHOLDS.MEDIUM).length,
      alertsResolved: staleAlerts.length,
      durationMs,
      criticalMembers: criticalMembers.map((s) => ({
        userId: s.userId,
        score: s.score,
        recommendedAction: s.recommendedAction,
      })),
      highMembers: highMembers.map((s) => ({
        userId: s.userId,
        score: s.score,
        recommendedAction: s.recommendedAction,
      })),
    });
  } catch (error) {
    console.error('[at-risk-check] Cron failed:', error);
    return NextResponse.json(
      { error: 'Failed to run at-risk check', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
