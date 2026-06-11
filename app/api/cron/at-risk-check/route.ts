import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  calculateAllAtRiskScores,
  persistAtRiskAlert,
  getRiskLevel,
  THRESHOLDS,
} from '@/lib/member/atRiskScoring';
import {
  sendAtRiskAlertDigestEmail,
  getAtRiskDigestRecipients,
} from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

/**
 * Nightly at-risk check — run via cron at 6 AM UTC.
 * Scores active members, persists alerts, sends counselor/admin digest email.
 * Vercel Cron uses GET — both GET and POST are supported.
 */
async function handle(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const scores = await calculateAllAtRiskScores();

  const criticalCount = scores.filter((s) => s.score >= THRESHOLDS.CRITICAL).length;
  const highRiskBucket = scores.filter((s) => s.score >= THRESHOLDS.HIGH);
  const highCount = highRiskBucket.filter((s) => s.score < THRESHOLDS.CRITICAL).length;
  const mediumCount = scores.filter(
    (s) => s.score >= THRESHOLDS.MEDIUM && s.score < THRESHOLDS.HIGH,
  ).length;

  for (const score of scores.filter((s) => s.score >= THRESHOLDS.MEDIUM)) {
    await persistAtRiskAlert(score);
  }

  const activeAlertUserIds = new Set(
    scores.filter((s) => s.score >= THRESHOLDS.MEDIUM).map((s) => s.userId),
  );

  const staleAlerts = await prisma.atRiskAlert.findMany({
    where: {
      status: { in: ['open', 'acknowledged'] },
      userId: { notIn: Array.from(activeAlertUserIds) },
    },
    select: { id: true },
    take: 100,
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

  const digestScores = scores.filter((s) => s.score >= THRESHOLDS.MEDIUM).slice(0, 50);
  const userRows =
    digestScores.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: digestScores.map((s) => s.userId) } },
          select: { id: true, email: true, fullName: true },
          take: 100,
        })
      : [];
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const digestMembers = digestScores.map((s) => {
    const u = userById.get(s.userId);
    return {
      fullName: u?.fullName ?? null,
      email: u?.email?.trim() ? u.email : '(no email on file)',
      score: s.score,
      level: getRiskLevel(s.score),
      factors: s.factors.map((f) => f.description),
      recommendedAction: s.recommendedAction,
      adminUrl: `${SITE_URL}/admin/members/${s.userId}`,
    };
  });

  const recipients = getAtRiskDigestRecipients();
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  let digestEmailSent = false;
  let digestEmailError: string | undefined;

  if (recipients.length > 0) {
    const digest = await sendAtRiskAlertDigestEmail({
      to: recipients,
      dateLabel,
      criticalCount,
      highCount,
      mediumCount,
      members: digestMembers,
    });
    digestEmailSent = digest.ok;
    digestEmailError = digest.error;
  } else {
    digestEmailError = 'No recipients';
  }

  const durationMs = Date.now() - startTime;
  const runResult = {
    success: true,
    scored: scores.length,
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    alertsCreated: scores.filter((s) => s.score >= THRESHOLDS.MEDIUM).length,
    alertsResolved: staleAlerts.length,
    durationMs,
    digestEmailSent,
    digestEmailError,
    digestRecipientCount: recipients.length,
    digestListedMembers: digestMembers.length,
  };
  await setCronRecordsProcessed(runResult.alertsCreated);
  await logCronRun(
    'cron_at_risk_check',
    runResult,
    digestEmailSent || recipients.length === 0 ? 'ok' : 'error',
  );
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_at_risk_check', handle);
export const POST = withCronLogging('cron_at_risk_check', handle);
