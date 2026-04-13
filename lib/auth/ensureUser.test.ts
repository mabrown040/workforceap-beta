import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureUserInDb } from './ensureUser';
import { prisma } from '../db/prisma';

test('ensureUserInDb - happy path', async (t) => {
  const organizationDelegate = prisma.organization as any;
  const userDelegate = prisma.user as any;
  const originalFindUnique = organizationDelegate.findUnique;
  const originalUpsert = userDelegate.upsert;

  t.after(() => {
    organizationDelegate.findUnique = originalFindUnique;
    userDelegate.upsert = originalUpsert;
  });

  organizationDelegate.findUnique = async () => ({ id: 'org-1' } as any);

  let upsertCalled = 0;
  userDelegate.upsert = async (_args: any) => {
    upsertCalled++;
    return {} as any;
  };

  await ensureUserInDb({ id: 'user-1', email: 'test@example.com' });
  assert.equal(upsertCalled, 1);
});

test('ensureUserInDb - handles P2002 unique constraint error by updating with email', async (t) => {
  const organizationDelegate = prisma.organization as any;
  const userDelegate = prisma.user as any;
  const originalFindUnique = organizationDelegate.findUnique;
  const originalUpsert = userDelegate.upsert;

  t.after(() => {
    organizationDelegate.findUnique = originalFindUnique;
    userDelegate.upsert = originalUpsert;
  });

  organizationDelegate.findUnique = async () => ({ id: 'org-1' } as any);

  let upsertCalls: any[] = [];
  userDelegate.upsert = async (args: any) => {
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
  const organizationDelegate = prisma.organization as any;
  const userDelegate = prisma.user as any;
  const originalFindUnique = organizationDelegate.findUnique;
  const originalUpsert = userDelegate.upsert;

  t.after(() => {
    organizationDelegate.findUnique = originalFindUnique;
    userDelegate.upsert = originalUpsert;
  });

  organizationDelegate.findUnique = async () => ({ id: 'org-1' } as any);

  const testError = new Error('Database connection failed');
  userDelegate.upsert = async () => {
    throw testError;
  };

  await assert.rejects(
    ensureUserInDb({ id: 'user-3', email: 'test3@example.com' }),
    testError
  );
});
