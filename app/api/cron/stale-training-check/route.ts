import { NextResponse } from 'next/server';

import { logCronRun } from '@/lib/admin/logCronRun';
import { runStaleCourseraTrainingCheck } from '@/lib/member/staleTrainingCron';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/stale-training-check
 *
 * Daily: members with `CourseEnrollment` but no fresh `CourseProgress` (7d)
 * get `User.staleTrainingDetectedAt` set once; cleared when progress updates
 * or program rollup hits 100% average.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runStaleCourseraTrainingCheck();
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
