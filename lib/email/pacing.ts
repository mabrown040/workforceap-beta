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
  let admissionTail: Promise<void> = Promise.resolve();

  return () => {
    // Serialize slot assignment itself. Callers may classify/query concurrently,
    // but simultaneous provider sends must not observe and claim the same slot.
    const admission = admissionTail.then(async (): Promise<PaceResult> => {
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
    });
    admissionTail = admission.then(() => undefined, () => undefined);
    return admission;
  };
}


export const BULK_EMAIL_CRON_INTERVAL_MS = 125;
export const BULK_EMAIL_CRON_ACCOUNTING_RESERVE_MS = 30_000;

export interface BulkEmailCronPacerOptions {
  maxDurationSeconds: number;
  startedAtMs?: number;
  intervalMs?: number;
  reserveMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type BulkEmailPacingSkipped = {
  ok: false;
  skipped: true;
  error: 'pacing_budget_exhausted' | 'request_deadline_exhausted';
};

/** One shared pacing policy for every cron that can issue multiple provider sends. */
export function createBulkEmailCronPacer(options: BulkEmailCronPacerOptions) {
  const now = options.now ?? Date.now;
  const startedAtMs = options.startedAtMs ?? now();
  const reserveMs = options.reserveMs ?? BULK_EMAIL_CRON_ACCOUNTING_RESERVE_MS;
  const deadlineAtMs = startedAtMs + options.maxDurationSeconds * 1_000 - reserveMs;
  const waitForSendSlot = createBoundedPacer({
    intervalMs: options.intervalMs ?? BULK_EMAIL_CRON_INTERVAL_MS,
    deadlineAtMs,
    sleep: options.sleep,
    now,
  });
  let admitted = 0;
  let skipped = 0;
  let skipReason: BulkEmailPacingSkipped['error'] | undefined;

  return {
    deadlineAtMs,
    waitForSendSlot,
    async run<T>(operation: () => Promise<T>): Promise<T | BulkEmailPacingSkipped> {
      const pace = await waitForSendSlot();
      if (!pace.ok) {
        skipped++;
        skipReason = pace.reason;
        return { ok: false, skipped: true, error: pace.reason };
      }
      admitted++;
      return operation();
    },
    summary() {
      return { admitted, skipped, ...(skipReason ? { skipReason } : {}) };
    },
  };
}
