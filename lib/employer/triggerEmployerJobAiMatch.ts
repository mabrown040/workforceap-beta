import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { createAdminJobMatchesPrismaDeps } from '@/lib/admin/adminJobMatchesPrismaDeps';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';

/**
 * Runs AI candidate matching after a job becomes live. Intended for use inside
 * `after()` from `next/server` so the platform keeps the invocation alive until work finishes.
 */
export async function runAiMatchForLiveJob(jobId: string): Promise<void> {
  try {
    const result = await runAdminJobMatchesGet(
      jobId,
      createAdminJobMatchesPrismaDeps((input) =>
        recordWorkflowDiagnostic({
          workflow: 'employer_job_live_auto_match',
          actorUserId: null,
          entityType: 'job',
          entityId: jobId,
          status: input.status,
          summary: input.summary,
          method: input.method,
          fallbackPath: input.fallbackPath ?? null,
          metadata: input.metadata ? { ...input.metadata, jobId } : { jobId },
        })
      )
    );

    if ('notFound' in result && result.notFound) {
      console.error(`[employer_match_auto] jobId=${jobId} error=job not found`);
      return;
    }

    const count =
      'body' in result && Array.isArray(result.body) ? result.body.length : 0;
    console.log(`[employer_match_auto] jobId=${jobId} triggered matches=${count}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[employer_match_auto] jobId=${jobId} error=${msg}`);
  }
}
