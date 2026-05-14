import { NextResponse } from 'next/server';
import { logCronRun } from '@/lib/admin/logCronRun';
import { runWithGucContext, SYSTEM_GUC_CONTEXT } from '@/lib/db/gucContext';
import { authorizeCronRequest } from './authorizeCronRequest';
import { isCronEnabled } from './isCronEnabled';
import { startCronExecution, completeCronExecution, runWithCronExecution } from './cronExecution';

/**
 * Wrap a cron route handler with standard auth, toggle check, error logging,
 * and structured CronExecution tracking.
 *
 * Ensures that even if the handler throws (DB error, timeout, etc.),
 * a CronExecution record is created so the admin dashboard can show
 * exactly what happened, when, and for how long.
 */
export function withCronLogging(
  workflowKey: string,
  handler: (request: any) => Promise<any>,
) {
  return async function (request: any): Promise<any> {
    const unauthorized = authorizeCronRequest(request);
    if (unauthorized) return unauthorized;

    const executionId = await startCronExecution(workflowKey);

    return runWithCronExecution(executionId, async () => {
      if (!(await isCronEnabled(workflowKey))) {
        await completeCronExecution(executionId, 'SKIPPED');
        await logCronRun(workflowKey, { skipped: true, reason: 'disabled' }, 'ok');
        return NextResponse.json({ skipped: true, reason: 'disabled' });
      }

      try {
        const response = await runWithGucContext(SYSTEM_GUC_CONTEXT, () => handler(request));
        // Inspect the response status: some wrapped handlers (e.g.
        // /api/cron/coursera-training-sync) catch their own exceptions
        // and return a 500 JSON response instead of rethrowing. Without
        // this check the wrapper would record SUCCESS for those runs,
        // corrupting the admin cron dashboard exactly when a cron failed.
        const status =
          response && typeof response === 'object' && 'status' in response
            ? (response as { status: number }).status
            : 200;
        if (status >= 500) {
          await completeCronExecution(
            executionId,
            'FAILED',
            `handler returned status ${status}`,
          );
        } else {
          await completeCronExecution(executionId, 'SUCCESS');
        }
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`[cron:${workflowKey}] Unhandled error:`, error);
        await completeCronExecution(executionId, 'FAILED', error.message);
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
    });
  };
}
