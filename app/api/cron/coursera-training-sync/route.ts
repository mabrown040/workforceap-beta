import { NextResponse } from 'next/server';

import { logCronRun } from '@/lib/admin/logCronRun';
import { replayPendingXapiStatements } from '@/lib/coursera/replayPendingXapi';
import { runCourseraSkillsetProgressProbe } from '@/lib/coursera/skillsetProgressCronProbe';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/coursera-training-sync
 *
 * Hourly: replay pending xAPI rows into `CourseProgress`, then probe Coursera
 * Enterprise skillset API (metadata only until skillset→course mapping exists).
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
    let skillset: Awaited<ReturnType<typeof runCourseraSkillsetProgressProbe>> | null = null;
    try {
      skillset = await runCourseraSkillsetProgressProbe();
    } catch (err) {
      captureApiError(err, { route: 'cron/coursera-training-sync/skillset-probe' });
      skillset = {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skippedReason: err instanceof Error ? err.message : 'skillset probe error',
        note: '',
      };
    }

    const runResult = { xapi, skillset };
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
