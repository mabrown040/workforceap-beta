/**
 * Daily counselor at-risk alert batcher.
 *
 * Runs at 8am local time. Scores active members, finds those with CRITICAL
 * risk (score ≥ 70), groups by assigned counselor, and sends one batched
 * email per counselor. Deduplicates: skips members whose alert was already
 * notified to a counselor within the last 24 hours.
 */

import { prisma } from '@/lib/db/prisma';
import {
  calculateAllAtRiskScores,
  getRiskLevel,
  THRESHOLDS,
  type AtRiskScore,
} from '@/lib/member/atRiskScoring';
import { sendCounselorAtRiskAlertEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

export type CounselorAlertResult = {
  counselorId: string;
  counselorEmail: string;
  counselorName: string;
  sent: boolean;
  memberCount: number;
  error?: string;
};

export type DailyAtRiskAlertRunResult = {
  success: boolean;
  counselorsNotified: number;
  membersFlagged: number;
  skippedNoCounselor: number;
  skippedAlreadyNotified: number;
  results: CounselorAlertResult[];
};

export async function runDailyAtRiskCounselorAlerts(): Promise<DailyAtRiskAlertRunResult> {
  const scores = await calculateAllAtRiskScores();
  const criticalScores = scores.filter((s) => s.score >= THRESHOLDS.CRITICAL);

  if (criticalScores.length === 0) {
    return {
      success: true,
      counselorsNotified: 0,
      membersFlagged: 0,
      skippedNoCounselor: 0,
      skippedAlreadyNotified: 0,
      results: [],
    };
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Ensure alerts exist for all critical scores so we can track notifiedCounselorAt
  // Batch: find all existing alerts in one query, then create only missing ones.
  const existingAlerts = await prisma.atRiskAlert.findMany({
    take: 5000,
    where: {
      userId: { in: criticalScores.map((s) => s.userId) },
      status: { in: ['open', 'acknowledged'] },
    },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingAlerts.map((a) => a.userId));

  const alertsToCreate = criticalScores
    .filter((s) => !existingUserIds.has(s.userId))
    .map((s) => ({
      userId: s.userId,
      score: s.score,
      factors: s.factors as any,
      status: 'open' as const,
    }));

  if (alertsToCreate.length > 0) {
    try {
      await prisma.atRiskAlert.createMany({ data: alertsToCreate });
    } catch (err) {
      console.error('[at-risk-alerts] Failed to batch-create alerts:', err);
    }
  }

  // Get members with active counselor assignments
  const membersWithCounselors = await prisma.user.findMany({
    take: 500,
    where: {
      id: { in: criticalScores.map((s) => s.userId) },
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      counselorAssignments: {
        where: { active: true },
        select: {
          counselor: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  fullName: true,
                },
              },
            },
          },
        },
        take: 1,
      },
    },
  });

  const memberById = new Map(membersWithCounselors.map((m) => [m.id, m]));

  // Find all alerts for critical members (freshly created or existing)
  const alerts = await prisma.atRiskAlert.findMany({
    take: 5000,
    where: {
      userId: { in: criticalScores.map((s) => s.userId) },
      status: { in: ['open', 'acknowledged'] },
    },
    select: {
      id: true,
      userId: true,
      notifiedCounselorAt: true,
    },
  });

  const alertByUserId = new Map(alerts.map((a) => [a.userId, a]));

  // Group by counselor
  const counselorBatches = new Map<
    string,
    {
      counselorId: string;
      counselorEmail: string;
      counselorName: string;
      members: Array<{
        userId: string;
        fullName: string | null;
        email: string | null;
        score: number;
        level: string;
        factors: string[];
        recommendedAction: string;
        alertId: string;
      }>;
    }
  >();

  let skippedNoCounselor = 0;
  let skippedAlreadyNotified = 0;

  for (const score of criticalScores) {
    const member = memberById.get(score.userId);
    if (!member) continue;

    const counselor = member.counselorAssignments[0]?.counselor;
    if (!counselor?.user?.email) {
      skippedNoCounselor++;
      continue;
    }

    const alert = alertByUserId.get(score.userId);
    if (alert?.notifiedCounselorAt && alert.notifiedCounselorAt >= twentyFourHoursAgo) {
      skippedAlreadyNotified++;
      continue;
    }

    const batch = counselorBatches.get(counselor.id) || {
      counselorId: counselor.id,
      counselorEmail: counselor.user.email,
      counselorName: counselor.user.fullName ?? 'Counselor',
      members: [],
    };

    batch.members.push({
      userId: score.userId,
      fullName: member.fullName,
      email: member.email,
      score: score.score,
      level: getRiskLevel(score.score),
      factors: score.factors.map((f) => f.description),
      recommendedAction: score.recommendedAction,
      alertId: alert?.id ?? '',
    });

    counselorBatches.set(counselor.id, batch);
  }

  const results: CounselorAlertResult[] = [];

  for (const batch of counselorBatches.values()) {
    if (batch.members.length === 0) continue;

    const result = await sendCounselorAtRiskAlertEmail({
      to: batch.counselorEmail,
      counselorName: batch.counselorName,
      members: batch.members.map((m) => ({
        memberName: m.fullName ?? 'Unknown',
        memberEmail: m.email ?? '(no email)',
        score: m.score,
        level: m.level,
        factors: m.factors,
        recommendedAction: m.recommendedAction,
        profileUrl: `${SITE_URL}/counselor/students/${m.userId}`,
      })),
      dashboardUrl: `${SITE_URL}/counselor/at-risk`,
    });

    if (result.ok) {
      const alertIds = batch.members.map((m) => m.alertId).filter(Boolean);
      if (alertIds.length > 0) {
        await prisma.atRiskAlert.updateMany({
          where: { id: { in: alertIds } },
          data: { notifiedCounselorAt: new Date() },
        });
      }
    }

    results.push({
      counselorId: batch.counselorId,
      counselorEmail: batch.counselorEmail,
      counselorName: batch.counselorName,
      sent: result.ok,
      memberCount: batch.members.length,
      error: result.error,
    });
  }

  return {
    success: true,
    counselorsNotified: results.filter((r) => r.sent).length,
    membersFlagged: results.reduce((sum, r) => sum + r.memberCount, 0),
    skippedNoCounselor,
    skippedAlreadyNotified,
    results,
  };
}
