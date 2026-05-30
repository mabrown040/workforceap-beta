import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchCronSummary } from './_cronSummary';
import { prisma } from '@/lib/db/prisma';

test('fetchCronSummary returns stats and last run per job', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalCount = cronDelegate.count;
  const originalAggregate = cronDelegate.aggregate;
  const originalQueryRaw = prisma.$queryRaw;

  t.after(() => {
    cronDelegate.count = originalCount;
    cronDelegate.aggregate = originalAggregate;
    (prisma as any).$queryRaw = originalQueryRaw;
  });

  cronDelegate.count = async () => 10;
  cronDelegate.aggregate = async () => ({ _avg: { durationMs: 2500 } });
  (prisma as any).$queryRaw = async () => [
    { job_name: 'cron_test', last_run_at: new Date(), last_status: 'SUCCESS', total_runs: 5, success_rate: 100 },
  ];

  const result = await fetchCronSummary();
  assert.equal(result.summary.totalJobs, 10);
  assert.equal(result.summary.avgDurationMs, 2500);
  assert.equal(result.lastRunPerJob.length, 1);
  assert.equal(result.lastRunPerJob[0].jobName, 'cron_test');
});

test('fetchCronSummary computes success rates correctly', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalCount = cronDelegate.count;
  const originalAggregate = cronDelegate.aggregate;
  const originalQueryRaw = prisma.$queryRaw;

  t.after(() => {
    cronDelegate.count = originalCount;
    cronDelegate.aggregate = originalAggregate;
    (prisma as any).$queryRaw = originalQueryRaw;
  });

  let countCalls = 0;
  cronDelegate.count = async (args: any) => {
    countCalls++;
    const where = args?.where;
    if (!where) return 20; // totalJobs
    if (where.status === 'RUNNING') return 0;
    if (where.status === 'FAILED' && where.startedAt?.gte) {
      const gte = where.startedAt.gte;
      const now = Date.now();
      const diff = now - gte.getTime();
      if (diff <= 25 * 60 * 60 * 1000) return 2; // 24h window
      return 3; // 7d window
    }
    if (where.status === 'SUCCESS' && where.startedAt?.gte) {
      const gte = where.startedAt.gte;
      const now = Date.now();
      const diff = now - gte.getTime();
      if (diff <= 25 * 60 * 60 * 1000) return 8;
      return 17;
    }
    return 0;
  };

  cronDelegate.aggregate = async () => ({ _avg: { durationMs: 1200 } });
  (prisma as any).$queryRaw = async () => [];

  const result = await fetchCronSummary();
  // 24h: 8 success + 2 failed = 10 total → 80%
  assert.equal(result.summary.successRate24h, 80);
  // 7d: 17 success + 3 failed = 20 total → 85%
  assert.equal(result.summary.successRate7d, 85);
});
