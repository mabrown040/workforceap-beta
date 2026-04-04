import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureUserInDb } from './ensureUser.ts';
import { prisma } from '../db/prisma.ts';

test('ensureUserInDb - happy path', async (t) => {
  const originalFindUnique = prisma.organization.findUnique;
  const originalUpsert = prisma.user.upsert;

  t.after(() => {
    prisma.organization.findUnique = originalFindUnique;
    prisma.user.upsert = originalUpsert;
  });

  prisma.organization.findUnique = async () => ({ id: 'org-1' } as any);

  let upsertCalled = 0;
  prisma.user.upsert = async (args) => {
    upsertCalled++;
    return {} as any;
  };

  await ensureUserInDb({ id: 'user-1', email: 'test@example.com' });
  assert.equal(upsertCalled, 1);
});

test('ensureUserInDb - handles P2002 unique constraint error by updating with email', async (t) => {
  const originalFindUnique = prisma.organization.findUnique;
  const originalUpsert = prisma.user.upsert;

  t.after(() => {
    prisma.organization.findUnique = originalFindUnique;
    prisma.user.upsert = originalUpsert;
  });

  prisma.organization.findUnique = async () => ({ id: 'org-1' } as any);

  const upsertCalls: any[] = [];
  prisma.user.upsert = async (args: any) => {
    upsertCalls.push(args);
    if (upsertCalls.length === 1) {
      throw { code: 'P2002' };
    }
    return {} as any;
  };

  await ensureUserInDb({ id: 'user-2', email: 'test2@example.com' });

  assert.equal(upsertCalls.length, 2);
  assert.deepEqual(upsertCalls[0].where, { id: 'user-2' });
  assert.deepEqual(upsertCalls[1].where, { email: 'test2@example.com' });
  assert.deepEqual(upsertCalls[1].update, { id: 'user-2' });
});

test('ensureUserInDb - rethrows non-P2002 errors', async (t) => {
  const originalFindUnique = prisma.organization.findUnique;
  const originalUpsert = prisma.user.upsert;

  t.after(() => {
    prisma.organization.findUnique = originalFindUnique;
    prisma.user.upsert = originalUpsert;
  });

  prisma.organization.findUnique = async () => ({ id: 'org-1' } as any);

  const testError = new Error('Database connection failed');
  prisma.user.upsert = async () => {
    throw testError;
  };

  await assert.rejects(
    ensureUserInDb({ id: 'user-3', email: 'test3@example.com' }),
    testError
  );
});
