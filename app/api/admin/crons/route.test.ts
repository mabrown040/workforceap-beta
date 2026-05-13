import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from './route';
import { prisma } from '@/lib/db/prisma';

// Mock auth
const authModule = await import('@/lib/auth/server');
const rolesModule = await import('@/lib/auth/roles');

test('GET /api/admin/crons returns 401 for non-admin', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'user-1', email: 'user@example.com' });
  (rolesModule as any).isAdmin = async () => false;

  const request = new Request('http://localhost/api/admin/crons');
  const response = await GET(request);
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.error, 'Unauthorized');
});

test('GET /api/admin/crons returns executions for admin', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindMany = cronDelegate.findMany;
  const originalCount = cronDelegate.count;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
    cronDelegate.findMany = originalFindMany;
    cronDelegate.count = originalCount;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'admin-1', email: 'admin@example.com' });
  (rolesModule as any).isAdmin = async () => true;

  const mockExecutions = [
    { id: 'exec-1', jobName: 'cron_test', status: 'SUCCESS', startedAt: new Date(), completedAt: new Date(), errorMessage: null, recordsProcessed: 5, durationMs: 1000 },
  ];

  cronDelegate.findMany = async () => mockExecutions;
  cronDelegate.count = async () => 1;

  const request = new Request('http://localhost/api/admin/crons');
  const response = await GET(request);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.executions.length, 1);
  assert.equal(body.executions[0].jobName, 'cron_test');
  assert.equal(body.pagination.total, 1);
});

test('GET /api/admin/crons filters by job name', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindMany = cronDelegate.findMany;
  const originalCount = cronDelegate.count;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
    cronDelegate.findMany = originalFindMany;
    cronDelegate.count = originalCount;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'admin-1', email: 'admin@example.com' });
  (rolesModule as any).isAdmin = async () => true;

  let capturedWhere: any;
  cronDelegate.findMany = async ({ where }: any) => {
    capturedWhere = where;
    return [];
  };
  cronDelegate.count = async () => 0;

  const request = new Request('http://localhost/api/admin/crons?jobName=weekly');
  await GET(request);

  assert.ok(capturedWhere.jobName);
  assert.equal(capturedWhere.jobName.contains, 'weekly');
});

test('GET /api/admin/crons filters by status', async (t) => {
  const originalGetUser = (authModule as any).getUser;
  const originalIsAdmin = (rolesModule as any).isAdmin;
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindMany = cronDelegate.findMany;
  const originalCount = cronDelegate.count;

  t.after(() => {
    (authModule as any).getUser = originalGetUser;
    (rolesModule as any).isAdmin = originalIsAdmin;
    cronDelegate.findMany = originalFindMany;
    cronDelegate.count = originalCount;
  });

  (authModule as any).getUser = async () =>
    ({ id: 'admin-1', email: 'admin@example.com' });
  (rolesModule as any).isAdmin = async () => true;

  let capturedWhere: any;
  cronDelegate.findMany = async ({ where }: any) => {
    capturedWhere = where;
    return [];
  };
  cronDelegate.count = async () => 0;

  const request = new Request('http://localhost/api/admin/crons?status=FAILED');
  await GET(request);

  assert.equal(capturedWhere.status, 'FAILED');
});
