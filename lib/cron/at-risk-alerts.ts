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
  buildMemberClassificationInput,
  calculateAllAtRiskScores,
  classifyMember,
  getRiskLevel,
  THRESHOLDS,
  type AtRiskScore,
  type AtRiskTier,
  type ClassifyMemberResult,
} from '@/lib/member/atRiskScoring';
import {
  sendCounselorAtRiskAlertEmail,
  sendMemberCheckInEmail,
  sendMemberComeBackEmail,
  sendMemberStuckEmail,
} from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const NUDGE_COOLDOWN_DAYS = 7;
const NUDGE_COOLDOWN_MS = NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// Bounded-concurrency batch size. Each candidate requires a classification
// pass (Prisma lookup + external B4B/Coursera HTTP call) plus a cooldown
// check and possibly an email send, so members are processed in small
// batches rather than one-at-a-time (too slow for 500 members) or all at
// once (risk of overwhelming the external API / DB pool / email provider).
const NUDGE_BATCH_SIZE = 15;

type NudgeKind = 'check_in' | 'come_back' | 'stuck';

function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return 'there';
  const trimmed = fullName.trim().split(/\s+/)[0];
  return trimmed || 'there';
}

function chooseNudge(
  classification: ClassifyMemberResult,
): { kind: NudgeKind; tier: AtRiskTier } | null {
  if (classification.tier === 'green') return null;
  const stuck = classification.reasons.some(
    (r) =>
      r.toLowerCase().includes('stalled') ||
      r.toLowerCase().includes('coursera progress'),
  );
  if (classification.tier === 'red') {
    // 14d+ stall or no login >=14 → stuck; else come_back
    const heavy =
      classification.daysSinceLogin >= 14 ||
      classification.reasons.some((r) => /14 days|stalled for/i.test(r));
    if (heavy || stuck) return { kind: 'stuck', tier: 'red' };
    return { kind: 'come_back', tier: 'red' };
  }
  // yellow
  return { kind: 'check_in', tier: 'yellow' };
}

export type RetentionNudgeResult = {
  success: boolean;
  scanned: number;
  sentCheckIn: number;
  sentComeBack: number;
  sentStuck: number;
  skippedCooldown: number;
  skippedNoEmail: number;
  errors: number;
};

/**
 * G5 retention loop: classify members, send tiered nudge emails, respect
 * the per-tier 7-day cooldown via `MemberNudgeLog`.
 *
 * Idempotent — re-running within the cooldown window is a no-op for any
 * member who already received a nudge of that tier in the window.
 */
export async function runMemberRetentionNudges(): Promise<RetentionNudgeResult> {
  const candidates = await prisma.user.findMany({
    take: 500,
    where: {
      deletedAt: null,
      placementRecord: null,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      counselorAssignments: {
        where: { active: true },
        take: 1,
        select: {
          counselor: {
            select: { user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  let scanned = 0;
  let sentCheckIn = 0;
  let sentComeBack = 0;
  let sentStuck = 0;
  let skippedCooldown = 0;
  let skippedNoEmail = 0;
  let errors = 0;

  const cooldownCutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);

  type NudgeOutcome = {
    skippedNoEmail?: boolean;
    errors?: number;
    skippedCooldown?: boolean;
    sentCheckIn?: boolean;
    sentComeBack?: boolean;
    sentStuck?: boolean;
  };

  const processMember = async (
    member: (typeof candidates)[number],
  ): Promise<NudgeOutcome> => {
    if (!member.email) {
      return { skippedNoEmail: true };
    }

    let classification: ClassifyMemberResult;
    try {
      const input = await buildMemberClassificationInput(member.id);
      classification = classifyMember(input);
    } catch (err) {
      console.error(`[retention-nudges] classify failed for ${member.id}:`, err);
      return { errors: 1 };
    }

    const choice = chooseNudge(classification);
    if (!choice) return {};

    // Cooldown: don't send same tier again within window
    const recent = await prisma.memberNudgeLog.findFirst({
      where: {
        userId: member.id,
        tier: choice.tier,
        sentAt: { gte: cooldownCutoff },
      },
      select: { id: true },
    });
    if (recent) {
      return { skippedCooldown: true };
    }

    const firstName = firstNameOf(member.fullName);
    const counselorName =
      member.counselorAssignments[0]?.counselor?.user?.fullName?.trim() ||
      'Your WorkforceAP counselor';

    let sent = false;
    const outcome: NudgeOutcome = {};
    try {
      if (choice.kind === 'check_in') {
        const result = await sendMemberCheckInEmail({
          to: member.email,
          firstName,
          dashboardUrl: `${SITE_URL}/dashboard`,
        });
        if (result.ok) {
          outcome.sentCheckIn = true;
          sent = true;
        } else outcome.errors = 1;
      } else if (choice.kind === 'come_back') {
        const result = await sendMemberComeBackEmail({
          to: member.email,
          firstName,
          counselorName,
          nextBestActionUrl: `${SITE_URL}/dashboard`,
        });
        if (result.ok) {
          outcome.sentComeBack = true;
          sent = true;
        } else outcome.errors = 1;
      } else {
        const result = await sendMemberStuckEmail({
          to: member.email,
          firstName,
          counselorName,
        });
        if (result.ok) {
          outcome.sentStuck = true;
          sent = true;
        } else outcome.errors = 1;
      }
    } catch (err) {
      console.error(`[retention-nudges] send failed for ${member.id}:`, err);
      outcome.errors = 1;
    }

    if (sent) {
      try {
        await prisma.memberNudgeLog.create({
          data: {
            userId: member.id,
            tier: choice.tier,
            kind: choice.kind,
            reasons: classification.reasons as unknown as object,
          },
        });
      } catch (err) {
        console.error(`[retention-nudges] log write failed for ${member.id}:`, err);
      }
    }

    return outcome;
  };

  for (let i = 0; i < candidates.length; i += NUDGE_BATCH_SIZE) {
    const batch = candidates.slice(i, i + NUDGE_BATCH_SIZE);
    const outcomes = await Promise.all(batch.map(processMember));
    for (const outcome of outcomes) {
      scanned++;
      if (outcome.skippedNoEmail) skippedNoEmail++;
      if (outcome.skippedCooldown) skippedCooldown++;
      if (outcome.sentCheckIn) sentCheckIn++;
      if (outcome.sentComeBack) sentComeBack++;
      if (outcome.sentStuck) sentStuck++;
      if (outcome.errors) errors += outcome.errors;
    }
  }

  return {
    success: true,
    scanned,
    sentCheckIn,
    sentComeBack,
    sentStuck,
    skippedCooldown,
    skippedNoEmail,
    errors,
  };
}

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
