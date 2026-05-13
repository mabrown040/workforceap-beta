import { NextResponse } from 'next/server';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { runDailyPlacementSurveyCron } from '@/lib/cron/placement-surveys';
import { logCronRun } from '@/lib/admin/logCronRun';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

/**
 * POST /api/cron/placement-survey
 *
 * Daily cron: sends 30/60/90-day placement surveys and escalates
 * non-responders to counselors. Idempotent per wave per placement.
 *
 * Schedule: 0 14 * * * (2 PM UTC ~ 9 AM CDT)
 */
async function handle(_request: Request) {
  const result = await runDailyPlacementSurveyCron();

  const totalSent = result.waves.reduce((sum, w) => sum + w.sent.length, 0);
  const totalSkipped = result.waves.reduce((sum, w) => sum + w.skipped.length, 0);
  const totalEmailFailures = result.waves.reduce((sum, w) => sum + w.emailFailures.length, 0);

  const runResult = {
    ...result,
    summary: {
      totalSent,
      totalSkipped,
      totalEmailFailures,
      escalationsAlerted: result.escalations.alerted.length,
      escalationsSkipped: result.escalations.skipped.length,
      escalationsEmailFailures: result.escalations.emailFailures.length,
    },
  };

  const status =
    totalEmailFailures === 0 && result.escalations.emailFailures.length === 0
      ? 'ok'
      : totalEmailFailures > 0 || result.escalations.emailFailures.length > 0
        ? 'partial'
        : 'error';

  await setCronRecordsProcessed(totalSent);
  await logCronRun('cron_placement_survey', runResult, status);

  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_placement_survey', handle);
export const POST = withCronLogging('cron_placement_survey', handle);
