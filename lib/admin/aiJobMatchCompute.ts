import { matchStudentsForJob } from '@/lib/ai/matchStudents';

export type JobMatchInput = Parameters<typeof matchStudentsForJob>[0];

type MatchList = Awaited<ReturnType<typeof matchStudentsForJob>>;

const computePromises = new Map<string, Promise<MatchList>>();
const emptyCooldownUntil = new Map<string, number>();

/** Skip expensive re-runs when the last result was empty (per-instance; best-effort under serverless). */
export const AI_JOB_MATCH_EMPTY_COOLDOWN_MS = 60_000;

/**
 * Deduplicate concurrent AI match runs for the same job and soften failures so the HTTP handler can still respond.
 */
export async function getOrComputeAiJobMatches(jobId: string, job: JobMatchInput): Promise<MatchList> {
  const existing = computePromises.get(jobId);
  if (existing) return existing;

  const until = emptyCooldownUntil.get(jobId) ?? 0;
  if (Date.now() < until) {
    return [];
  }

  const p = (async () => {
    try {
      return await matchStudentsForJob(job);
    } catch (err) {
      console.error('[ai job matches] matchStudentsForJob failed', {
        jobId,
        message: err instanceof Error ? err.message : String(err),
      });
      return [];
    } finally {
      computePromises.delete(jobId);
    }
  })();

  computePromises.set(jobId, p);
  return p;
}

export function markAiJobMatchEmptyCooldown(jobId: string): void {
  emptyCooldownUntil.set(jobId, Date.now() + AI_JOB_MATCH_EMPTY_COOLDOWN_MS);
}

export function clearAiJobMatchEmptyCooldown(jobId: string): void {
  emptyCooldownUntil.delete(jobId);
}
