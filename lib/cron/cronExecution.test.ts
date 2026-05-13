import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startCronExecution,
  completeCronExecution,
  setCronRecordsProcessed,
  getCurrentCronExecutionId,
  runWithCronExecution,
} from './cronExecution';
import { prisma } from '../db/prisma';

test('startCronExecution creates a RUNNING record', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalCreate = cronDelegate.create;
  const originalFindUnique = cronDelegate.findUnique;
  const originalUpdate = cronDelegate.update;

  t.after(() => {
    cronDelegate.create = originalCreate;
    cronDelegate.findUnique = originalFindUnique;
    cronDelegate.update = originalUpdate;
  });

  cronDelegate.create = async () => ({ id: 'exec-123', jobName: 'test_job', status: 'RUNNING' });
  cronDelegate.findUnique = async () => ({ startedAt: new Date() });
  cronDelegate.update = async () => ({ id: 'exec-123' });

  const id = await startCronExecution('test_job');
  assert.equal(id, 'exec-123');
});

test('completeCronExecution updates status and duration', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindUnique = cronDelegate.findUnique;
  const originalUpdate = cronDelegate.update;

  t.after(() => {
    cronDelegate.findUnique = originalFindUnique;
    cronDelegate.update = originalUpdate;
  });

  const startedAt = new Date(Date.now() - 5000);
  cronDelegate.findUnique = async () => ({ startedAt });
  let updateData: any;
  cronDelegate.update = async ({ data }: any) => {
    updateData = data;
    return { id: 'exec-123' };
  };

  await completeCronExecution('exec-123', 'SUCCESS');
  assert.equal(updateData.status, 'SUCCESS');
  assert.ok(updateData.completedAt instanceof Date);
  assert.ok(typeof updateData.durationMs === 'number');
  assert.ok(updateData.durationMs >= 5000);
});

test('completeCronExecution captures error message', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalFindUnique = cronDelegate.findUnique;
  const originalUpdate = cronDelegate.update;

  t.after(() => {
    cronDelegate.findUnique = originalFindUnique;
    cronDelegate.update = originalUpdate;
  });

  cronDelegate.findUnique = async () => ({ startedAt: new Date() });
  let updateData: any;
  cronDelegate.update = async ({ data }: any) => {
    updateData = data;
    return { id: 'exec-123' };
  };

  await completeCronExecution('exec-123', 'FAILED', 'Something broke');
  assert.equal(updateData.status, 'FAILED');
  assert.equal(updateData.errorMessage, 'Something broke');
});

test('setCronRecordsProcessed updates records within async context', async (t) => {
  const cronDelegate = (prisma as any).cronExecution;
  const originalUpdate = cronDelegate.update;

  t.after(() => {
    cronDelegate.update = originalUpdate;
  });

  let updateData: any;
  cronDelegate.update = async ({ data }: any) => {
    updateData = data;
    return { id: 'exec-123' };
  };

  await runWithCronExecution('exec-123', async () => {
    await setCronRecordsProcessed(42);
  });

  assert.equal(updateData.recordsProcessed, 42);
});

test('setCronRecordsProcessed is a no-op outside async context', async () => {
  // Should not throw even when no async context is set
  await assert.doesNotReject(async () => {
    await setCronRecordsProcessed(99);
  });
});

test('getCurrentCronExecutionId returns undefined outside context', () => {
  assert.equal(getCurrentCronExecutionId(), undefined);
});

test('getCurrentCronExecutionId returns id inside context', async (t) => {
  await runWithCronExecution('exec-456', async () => {
    assert.equal(getCurrentCronExecutionId(), 'exec-456');
  });
});
