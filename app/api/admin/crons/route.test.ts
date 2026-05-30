import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCronsWhere, fetchCrons } from './_cronsQuery';
import { prisma } from '@/lib/db/prisma';

test('buildCronsWhere returns empty object when no filters', () => {
  const where = buildCronsWhere({ page: 1, pageSize: 25 });
  assert.deepEqual(where, {});
});

test('buildCronsWhere filters by jobName with case-insensitive contains', () => {
  const where = buildCronsWhere({ jobName: 'weekly', page: 1, pageSize: 25 });
  assert.equal((where.jobName as any).contains, 'weekly');
  assert.equal((where.jobName as any).mode, 'insensitive');
});

test('buildCronsWhere filters by status', () => {
  const where = buildCronsWhere({ status: 'FAILED', page: 1, pageSize: 25 });
  assert.equal(where.status, 'FAILED');
});

test('buildCronsWhere filters by date range', () => {
  const where = buildCronsWhere({ dateFrom: '2026-01-01', dateTo: '2026-01-31', page: 1, pageSize: 25 });
  assert.ok(where.startedAt);
  assert.ok((where.startedAt as any).gte instanceof Date);
  assert.ok((where.startedAt as any).lte instanceof Date);
});

test('fetchCrons returns executions with pagination', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindMany = cronDelegate.findMany;
  const originalCount = cronDelegate.count;

  t.after(() => {
    cronDelegate.findMany = originalFindMany;
    cronDelegate.count = originalCount;
  });

  const mockExecutions = [
    { id: 'exec-1', jobName: 'cron_test', status: 'SUCCESS', startedAt: new Date(), completedAt: new Date(), errorMessage: null, recordsProcessed: 5, durationMs: 1000 },
  ];

  cronDelegate.findMany = async () => mockExecutions;
  cronDelegate.count = async () => 1;

  const result = await fetchCrons({ page: 1, pageSize: 25 });
  assert.equal(result.executions.length, 1);
  assert.equal(result.executions[0].jobName, 'cron_test');
  assert.equal(result.pagination.total, 1);
  assert.equal(result.pagination.totalPages, 1);
});
