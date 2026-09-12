import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';

import { createBoundedPacer, createBulkEmailCronPacer } from '@/lib/email/pacing';

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

describe('createBulkEmailCronPacer', () => {
  it('shares one deadline and reports admitted versus deadline-skipped sends', async () => {
    let nowMs = 1_000;
    const sleeps: number[] = [];
    const { createBulkEmailCronPacer } = await import('./pacing');
    const pacer = createBulkEmailCronPacer({
      maxDurationSeconds: 2,
      reserveMs: 1_000,
      intervalMs: 600,
      startedAtMs: nowMs,
      now: () => nowMs,
      sleep: async (ms) => { sleeps.push(ms); nowMs += ms; },
    });

    assert.deepEqual(await pacer.run(async () => ({ ok: true as const })), { ok: true });
    assert.deepEqual(await pacer.run(async () => ({ ok: true as const })), { ok: true });
    assert.deepEqual(await pacer.run(async () => ({ ok: true as const })), {
      ok: false,
      skipped: true,
      error: 'request_deadline_exhausted',
    });
    assert.deepEqual(sleeps, [600]);
    assert.deepEqual(pacer.summary(), {
      admitted: 2,
      skipped: 1,
      skipReason: 'request_deadline_exhausted',
    });
  });
});


describe('bulk email cron default cadence', () => {
  it('paces at about eight provider calls per second', async () => {
    let nowMs = 0;
    const sleeps: number[] = [];
    const { createBulkEmailCronPacer } = await import('./pacing');
    const pacer = createBulkEmailCronPacer({
      maxDurationSeconds: 300,
      startedAtMs: nowMs,
      now: () => nowMs,
      sleep: async (ms) => { sleeps.push(ms); nowMs += ms; },
    });
    await pacer.run(async () => true);
    await pacer.run(async () => true);
    await pacer.run(async () => true);
    assert.deepEqual(sleeps, [125, 125]);
  });
});


test('bulk cron run serializes concurrent send admissions at the shared cadence', async () => {
  let nowMs = 0;
  const sleeps: number[] = [];
  const pacer = createBulkEmailCronPacer({
    maxDurationSeconds: 10,
    reserveMs: 0,
    intervalMs: 125,
    now: () => nowMs,
    sleep: async (ms) => { sleeps.push(ms); nowMs += ms; },
  });
  const starts: number[] = [];
  await Promise.all([
    pacer.run(async () => { starts.push(nowMs); }),
    pacer.run(async () => { starts.push(nowMs); }),
    pacer.run(async () => { starts.push(nowMs); }),
  ]);
  assert.deepEqual(starts, [0, 125, 250]);
  assert.deepEqual(sleeps, [125, 125]);
});


test('concurrent callers reserve distinct slots before sleeping and share the wait budget', async () => {
  let nowMs = 0;
  const sleeps: number[] = [];
  const pace = createBoundedPacer({
    intervalMs: 125,
    maxTotalWaitMs: 125,
    now: () => nowMs,
    sleep: async (ms) => { sleeps.push(ms); nowMs += ms; },
  });

  const results = await Promise.all([pace(), pace(), pace()]);
  assert.deepEqual(results, [
    { ok: true, waitedMs: 0 },
    { ok: true, waitedMs: 125 },
    { ok: false, reason: 'pacing_budget_exhausted', requiredWaitMs: 125 },
  ]);
  assert.deepEqual(sleeps, [125]);
});

test('concurrent callers cannot reserve a slot at or beyond the shared deadline', async () => {
  let nowMs = 1_000;
  const pace = createBoundedPacer({
    intervalMs: 125,
    deadlineAtMs: 1_250,
    now: () => nowMs,
    sleep: async (ms) => { nowMs += ms; },
  });

  const results = await Promise.all([pace(), pace(), pace()]);
  assert.deepEqual(results, [
    { ok: true, waitedMs: 0 },
    { ok: true, waitedMs: 125 },
    { ok: false, reason: 'request_deadline_exhausted', requiredWaitMs: 125 },
  ]);
});
