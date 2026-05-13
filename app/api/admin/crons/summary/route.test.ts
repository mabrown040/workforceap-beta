import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from './route';
import { prisma } from '@/lib/db/prisma';

const authModule = await import('@/lib/auth/server');
const rolesModule = await import('@/lib/auth/roles');

test('GET /api/admin/crons/summary returns 401 for non-admin', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'user-1', email: 'user@example.com' });
  (rolesModule as any).isAdmin = async () => false;

  const response = await GET();
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.error, 'Unauthorized');
});

test('GET /api/admin/crons/summary returns stats for admin', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;
  const cronDelegate = (prisma as any).cronExecution;
  const originalCount = cronDelegate.count;
  const originalAggregate = cronDelegate.aggregate;
  const originalQueryRaw = prisma.$queryRaw;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
    cronDelegate.count = originalCount;
    cronDelegate.aggregate = originalAggregate;
    (prisma as any).$queryRaw = originalQueryRaw;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'admin-1', email: 'admin@example.com' });
  (rolesModule as any).isAdmin = async () => true;

  cronDelegate.count = async () => 10;
  cronDelegate.aggregate = async () => ({ _avg: { durationMs: 2500 } });
  (prisma as any).$queryRaw = async () => [
    { job_name: 'cron_test', last_run_at: new Date(), last_status: 'SUCCESS', total_runs: 5, success_rate: 100 },
  ];

  const response = await GET();
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.summary.totalJobs, 10);
  assert.equal(body.summary.avgDurationMs, 2500);
  assert.equal(body.lastRunPerJob.length, 1);
  assert.equal(body.lastRunPerJob[0].jobName, 'cron_test');
});
