export interface BoundedPacerOptions {
  intervalMs: number;
  maxTotalWaitMs?: number;
  /** Shared caller deadline; no pacing sleep may cross it. */
  deadlineAtMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type PaceResult =
  | { ok: true; waitedMs: number }
  | {
      ok: false;
      reason: 'pacing_budget_exhausted' | 'request_deadline_exhausted';
      requiredWaitMs: number;
    };

export function boundedPacingCapacity(intervalMs: number, maxTotalWaitMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs < 0) {
    throw new TypeError('intervalMs must be a non-negative finite number');
  }
  if (!Number.isFinite(maxTotalWaitMs) || maxTotalWaitMs < 0) {
    throw new TypeError('maxTotalWaitMs must be a non-negative finite number');
  }
  return intervalMs === 0
    ? Number.MAX_SAFE_INTEGER
    : Math.floor(maxTotalWaitMs / intervalMs) + 1;
}

/**
 * Shares one deterministic send cadence across a batch while putting a hard
 * ceiling on timer time. Callers must preserve the false result as a skipped
 * outcome rather than sending an unpaced remainder.
 */
export function createBoundedPacer(options: BoundedPacerOptions): () => Promise<PaceResult> {
  if (options.maxTotalWaitMs !== undefined) {
    boundedPacingCapacity(options.intervalMs, options.maxTotalWaitMs);
  } else if (!Number.isFinite(options.intervalMs) || options.intervalMs < 0) {
    throw new TypeError('intervalMs must be a non-negative finite number');
  }

  if (options.deadlineAtMs !== undefined && (!Number.isFinite(options.deadlineAtMs) || options.deadlineAtMs < 0)) {
    throw new TypeError('deadlineAtMs must be a non-negative finite number');
  }

  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let nextSlotAt = now();
  let totalWaitMs = 0;

  return async () => {
    const currentTime = now();
    const waitMs = Math.max(0, nextSlotAt - currentTime);
    if (options.deadlineAtMs !== undefined && currentTime + waitMs >= options.deadlineAtMs) {
      return { ok: false, reason: 'request_deadline_exhausted', requiredWaitMs: waitMs };
    }
    if (options.maxTotalWaitMs !== undefined && totalWaitMs + waitMs > options.maxTotalWaitMs) {
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
