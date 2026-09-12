import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBoundedPacer } from '@/lib/email/pacing';

describe('createBoundedPacer', () => {
  it('shares one deterministic cadence across successive sends', async () => {
    let now = 1_000;
    const delays: number[] = [];
    const pace = createBoundedPacer({
      intervalMs: 500,
      maxTotalWaitMs: 1_000,
      now: () => now,
      sleep: async (ms) => {
        delays.push(ms);
        now += ms;
      },
    });

    assert.deepEqual(await pace(), { ok: true, waitedMs: 0 });
    assert.deepEqual(await pace(), { ok: true, waitedMs: 500 });
    now += 200;
    assert.deepEqual(await pace(), { ok: true, waitedMs: 300 });
    assert.deepEqual(delays, [500, 300]);
  });

  it('returns a truthful skipped outcome instead of exceeding its total wait budget', async () => {
    let now = 0;
    const delays: number[] = [];
    const pace = createBoundedPacer({
      intervalMs: 500,
      maxTotalWaitMs: 600,
      now: () => now,
      sleep: async (ms) => {
        delays.push(ms);
        now += ms;
      },
    });

    assert.equal((await pace()).ok, true);
    assert.equal((await pace()).ok, true);
    assert.deepEqual(await pace(), {
      ok: false,
      reason: 'pacing_budget_exhausted',
      requiredWaitMs: 500,
    });
    assert.deepEqual(delays, [500]);
  });
  it('does not wait past a shared absolute request deadline', async () => {
    let now = 10_000;
    const delays: number[] = [];
    const pace = createBoundedPacer({
      intervalMs: 500,
      deadlineAtMs: 10_400,
      now: () => now,
      sleep: async (ms) => {
        delays.push(ms);
        now += ms;
      },
    });

    assert.deepEqual(await pace(), { ok: true, waitedMs: 0 });
    assert.deepEqual(await pace(), {
      ok: false,
      reason: 'request_deadline_exhausted',
      requiredWaitMs: 500,
    });
    assert.deepEqual(delays, []);
  });

});
