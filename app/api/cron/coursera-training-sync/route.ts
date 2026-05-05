import { NextResponse } from 'next/server';

import { logCronRun } from '@/lib/admin/logCronRun';
import { replayPendingXapiStatements } from '@/lib/coursera/replayPendingXapi';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/coursera-training-sync
 *
 * Hourly: replay pending xAPI rows into `CourseProgress`. Skillset progress
 * is pulled by `/api/cron/coursera-sync` on a 6h schedule.
 * Secured with `Authorization: Bearer ${CRON_SECRET}` (same as other crons).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const xapi = await replayPendingXapiStatements(200);
    const runResult = { xapi };
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
