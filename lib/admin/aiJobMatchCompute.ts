import { matchStudentsForJob } from '@/lib/ai/matchStudents';

export type JobMatchInput = Parameters<typeof matchStudentsForJob>[1];

type MatchList = Awaited<ReturnType<typeof matchStudentsForJob>>;

const computePromises = new Map<string, Promise<MatchList>>();
const emptyCooldownUntil = new Map<string, number>();

/** Skip expensive re-runs when the last result was empty (per-instance; best-effort under serverless). */
export const AI_JOB_MATCH_EMPTY_COOLDOWN_MS = 60_000;

/**
 * Deduplicate concurrent AI match runs for the same job and soften failures so the HTTP handler can still respond.
 */
export async function getOrComputeAiJobMatches(
  jobId: string,
  organizationId: string,
  job: JobMatchInput,
): Promise<MatchList> {
  const cacheKey = `${organizationId}:${jobId}`;
  const existing = computePromises.get(cacheKey);
  if (existing) return existing;

  const until = emptyCooldownUntil.get(cacheKey) ?? 0;
  if (Date.now() < until) {
    return [];
  }

  const p = (async () => {
    try {
      return await matchStudentsForJob(organizationId, job);
    } catch (err) {
      console.error('[ai job matches] matchStudentsForJob failed', {
        jobId,
        message: err instanceof Error ? err.message : String(err),
      });
      return [];
    } finally {
      computePromises.delete(cacheKey);
    }
  })();

  computePromises.set(cacheKey, p);
  return p;
}

export function markAiJobMatchEmptyCooldown(jobId: string, organizationId: string): void {
  emptyCooldownUntil.set(`${organizationId}:${jobId}`, Date.now() + AI_JOB_MATCH_EMPTY_COOLDOWN_MS);
}

export function clearAiJobMatchEmptyCooldown(jobId: string, organizationId: string): void {
  emptyCooldownUntil.delete(`${organizationId}:${jobId}`);
}
