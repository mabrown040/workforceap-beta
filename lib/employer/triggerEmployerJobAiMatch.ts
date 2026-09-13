import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import { createAdminJobMatchesPrismaDeps } from '@/lib/admin/adminJobMatchesPrismaDeps';
import { runAdminJobMatchesGet } from '@/lib/admin/runAdminJobMatchesGet';

/**
 * Runs AI candidate matching after a job becomes live. The caller must pass the
 * organization already proven while approving the job; this function rechecks
 * that pair before reading cached candidates or computing new matches.
 */
export async function runAiMatchForLiveJob(jobId: string, organizationId: string): Promise<void> {
  try {
    const deps = createAdminJobMatchesPrismaDeps(organizationId, (input) =>
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
    );
    const job = await deps.findAuthorizedJob(jobId);
    if (!job) {
      console.error(`[employer_match_auto] jobId=${jobId} error=job not found in organization`);
      return;
    }

    const result = await runAdminJobMatchesGet(jobId, job, deps);
    const count = Array.isArray(result.body) ? result.body.length : 0;
    console.log(`[employer_match_auto] jobId=${jobId} triggered matches=${count}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[employer_match_auto] jobId=${jobId} error=${message}`);
  }
}
