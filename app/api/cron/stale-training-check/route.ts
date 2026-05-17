import { NextResponse } from 'next/server';

import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { runStaleCourseraTrainingCheck } from '@/lib/member/staleTrainingCron';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/stale-training-check
 *
 * Daily: members with `CourseEnrollment` but no fresh `CourseProgress` (7d)
 * get `User.staleTrainingDetectedAt` set once; cleared when progress updates
 * or program rollup hits 100% average.
 */
async function handle(_request: Request) {
  try {
    const result = await runStaleCourseraTrainingCheck();
    await setCronRecordsProcessed(result.newlyFlagged ?? 0);
    await logCronRun('cron_stale_training_check', result, 'ok');
    return NextResponse.json(result);
  } catch (err) {
    captureApiError(err, { route: 'cron/stale-training-check' });
    await logCronRun(
      'cron_stale_training_check',
      { error: err instanceof Error ? err.message : 'unknown' },
      'error',
    );
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = withCronLogging('cron_stale_training_check', handle);
