import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
  runDailyAtRiskCounselorAlerts,
  runMemberRetentionNudges,
} from '@/lib/cron/at-risk-alerts';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

export const runtime = 'nodejs';
export const maxDuration = 300;

function verifyCronSecret(req: Request): boolean {
  const provided = req.headers.get('x-cron-secret') || '';
  const expected = process.env.CRON_SECRET || '';
  if (!expected || !provided) return false;
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest();
  const actualHash = createHash('sha256').update(provided, 'utf8').digest();
  return timingSafeEqual(actualHash, expectedHash);
}

/**
 * POST /api/cron/at-risk-alerts
 *
 * Daily counselor alert batcher + G5 member retention nudge sender.
 *  - Counselor alerts: groups CRITICAL at-risk members by counselor, sends
 *    one batched email per counselor, deduplicates against
 *    notifiedCounselorAt within the last 24h.
 *  - Member nudges: classifies active members green/yellow/red and sends
 *    tiered nudge emails (check-in / come-back / stuck). Idempotent: each
 *    tier is on a 7-day per-member cooldown via MemberNudgeLog.
 *
 * Vercel Cron schedule: 0 13 * * * (1pm UTC = 8am CDT)
 */
async function handle(_request: Request) {
  if (!verifyCronSecret(_request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const counselorResult = await runDailyAtRiskCounselorAlerts();
  const nudgeResult = await runMemberRetentionNudges();
  const recordsProcessed =
    (counselorResult.counselorsNotified ?? 0) +
    nudgeResult.sentCheckIn +
    nudgeResult.sentComeBack +
    nudgeResult.sentStuck;
  await setCronRecordsProcessed(recordsProcessed);
  return NextResponse.json({
    counselorAlerts: counselorResult,
    memberNudges: nudgeResult,
  });
}

export const GET = withCronLogging('cron_at_risk_alerts', handle);
export const POST = withCronLogging('cron_at_risk_alerts', handle);
