import { NextRequest, NextResponse } from 'next/server';

import { syncCourseraB4BEnrollmentReports } from '@/lib/coursera/b4bSync';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { logCronRun } from '@/lib/admin/logCronRun';
import { captureApiError } from '@/lib/observability/captureApiError';

/**
 * GET /api/cron/coursera-b4b-sync
 *
 * Recurring cron that pulls Coursera B4B enrollment reports and
 * persists course-level progress into CourseProgress.
 *
 * Schedule: every 6 hours (e.g. 0 star/6 in vercel.json).
 * Auth: CRON_SECRET via withCronLogging.
 */
const WORKFLOW_KEY = 'cron_coursera_b4b_sync';

async function handle(_req: NextRequest) {
  try {
    const result = await syncCourseraB4BEnrollmentReports();
    const runResult = {
      ok: true,
      scanned: result.scanned,
      upserted: result.upserted,
      skippedNoUser: result.skippedNoUser,
      skippedNoMapping: result.skippedNoMapping,
      errors: result.errors,
      byUserCount: Object.keys(result.byUser).length,
    };
    await logCronRun(WORKFLOW_KEY, runResult, result.errors > 0 ? 'error' : 'ok');
    return NextResponse.json(runResult);
  } catch (err) {
    captureApiError(err, { route: 'cron/coursera-b4b-sync' });
    await logCronRun(
      WORKFLOW_KEY,
      { error: err instanceof Error ? err.message : 'unknown' },
      'error',
    );
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = withCronLogging(WORKFLOW_KEY, handle);
export const POST = withCronLogging(WORKFLOW_KEY, handle);
