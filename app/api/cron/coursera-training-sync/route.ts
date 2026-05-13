import { NextResponse } from 'next/server';

import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { replayPendingXapiStatements } from '@/lib/coursera/replayPendingXapi';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/coursera-training-sync
 *
 * Hourly: replay pending xAPI rows into `CourseProgress`. Skillset progress
 * is pulled by `/api/cron/coursera-sync` on a 6h schedule.
 * Secured with `Authorization: Bearer ${CRON_SECRET}` (same as other crons).
 */
async function handle(_request: Request) {
  try {
    const xapi = await replayPendingXapiStatements(200);
    const runResult = { xapi };
    await setCronRecordsProcessed(xapi.replayed ?? 0);
    await logCronRun('cron_coursera_training_sync', runResult, 'ok');
    return NextResponse.json(runResult);
  } catch (err) {
    captureApiError(err, { route: 'cron/coursera-training-sync' });
    await logCronRun(
      'cron_coursera_training_sync',
      { error: err instanceof Error ? err.message : 'unknown' },
      'error',
    );
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = withCronLogging('cron_coursera_training_sync', handle);
