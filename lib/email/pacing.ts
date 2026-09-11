export interface BoundedPacerOptions {
  intervalMs: number;
  maxTotalWaitMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type PaceResult =
  | { ok: true; waitedMs: number }
  | { ok: false; reason: 'pacing_budget_exhausted'; requiredWaitMs: number };

/**
 * Shares one deterministic send cadence across a batch while putting a hard
 * ceiling on timer time. Callers must preserve the false result as a skipped
 * outcome rather than sending an unpaced remainder.
 */
export function createBoundedPacer(options: BoundedPacerOptions): () => Promise<PaceResult> {
  if (!Number.isFinite(options.intervalMs) || options.intervalMs < 0) {
    throw new TypeError('intervalMs must be a non-negative finite number');
  }
  if (!Number.isFinite(options.maxTotalWaitMs) || options.maxTotalWaitMs < 0) {
    throw new TypeError('maxTotalWaitMs must be a non-negative finite number');
  }

  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let nextSlotAt = now();
  let totalWaitMs = 0;

  return async () => {
    const currentTime = now();
    const waitMs = Math.max(0, nextSlotAt - currentTime);
    if (totalWaitMs + waitMs > options.maxTotalWaitMs) {
      return { ok: false, reason: 'pacing_budget_exhausted', requiredWaitMs: waitMs };
    }
    if (waitMs > 0) {
      await sleep(waitMs);
      totalWaitMs += waitMs;
    }
    nextSlotAt = Math.max(nextSlotAt, now()) + options.intervalMs;
    return { ok: true, waitedMs: waitMs };
  };
}
