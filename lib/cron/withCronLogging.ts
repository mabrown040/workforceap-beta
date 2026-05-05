import { NextResponse } from 'next/server';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from './authorizeCronRequest';
import { isCronEnabled } from './isCronEnabled';

/**
 * Wrap a cron route handler with standard auth, toggle check, and error logging.
 *
 * Ensures that even if the handler throws (DB error, timeout, etc.),
 * a WorkflowDiagnostic record is created so the admin UI and verification
 * cron can see what happened.
 */
export function withCronLogging(
  workflowKey: string,
  handler: (request: any) => Promise<any>,
) {
  return async function (request: any): Promise<any> {
    const unauthorized = authorizeCronRequest(request);
    if (unauthorized) return unauthorized;

    if (!(await isCronEnabled(workflowKey))) {
      await logCronRun(workflowKey, { skipped: true, reason: 'disabled' }, 'ok');
      return NextResponse.json({ skipped: true, reason: 'disabled' });
    }

    try {
      const response = await handler(request);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[cron:${workflowKey}] Unhandled error:`, error);
      await logCronRun(
        workflowKey,
        { ok: false, error: error.message, stack: error.stack },
        'error',
      );
      return NextResponse.json(
        { error: 'Cron failed', detail: error.message },
        { status: 500 },
      );
    }
  };
}
