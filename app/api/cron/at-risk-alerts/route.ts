import { NextResponse } from 'next/server';
import { runDailyAtRiskCounselorAlerts } from '@/lib/cron/at-risk-alerts';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * POST /api/cron/at-risk-alerts
 *
 * Daily counselor alert batcher.
 * Runs after the main at-risk-check cron (which scores members and persists alerts).
 * Groups CRITICAL at-risk members by counselor and sends one batched email per counselor.
 * Deduplicates against notifiedCounselorAt within the last 24 hours.
 *
 * Vercel Cron schedule: 0 13 * * * (1pm UTC = 8am CDT)
 */
async function handle(_request: Request) {
  const result = await runDailyAtRiskCounselorAlerts();
  return NextResponse.json(result);
}

export const GET = withCronLogging('cron_at_risk_alerts', handle);
export const POST = withCronLogging('cron_at_risk_alerts', handle);
