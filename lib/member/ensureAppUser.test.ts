import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureAppUserProvisioned } from './ensureAppUser';
import { prisma } from '../db/prisma';

const ORG_A = 'org-custom-1';
const DEFAULT_ORG = 'org-default';

function installProvisionMocks(t: { after: (fn: () => void) => void }) {
  const userDelegate = prisma.user as {
    findUnique: (...args: unknown[]) => unknown;
  };
  const originalFindUnique = userDelegate.findUnique;
  const originalTransaction = prisma.$transaction.bind(prisma);

  const state = {
    findUniqueResult: null as { id: string; profile: { userId: string } | null } | null,
    upserts: [] as Array<{
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }>,
  };

  userDelegate.findUnique = async () => state.findUniqueResult;
  (prisma as { $transaction: typeof prisma.$transaction }).$transaction = (async (
    fn: (tx: {
      user: { upsert: (args: unknown) => Promise<unknown> };
      role: { findUnique: () => Promise<{ id: string }>; create: () => Promise<{ id: string }> };
      userRole: { createMany: () => Promise<{ count: number }> };
      profile: { upsert: () => Promise<unknown> };
    }) => unknown,
  ) => {
    const tx = {
      user: {
        upsert: async (args: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          state.upserts.push(args);
          return {};
        },
      },
      role: {
        findUnique: async () => ({ id: 'role-member' }),
        create: async () => ({ id: 'role-member' }),
      },
      userRole: {
        createMany: async () => ({ count: 1 }),
      },
      profile: {
        upsert: async () => ({}),
      },
    };
    return fn(tx);
  }) as typeof prisma.$transaction;

  t.after(() => {
    userDelegate.findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
  });

  return state;
}

test('ensureAppUserProvisioned is a no-op when user + profile already exist', async (t) => {
  const state = installProvisionMocks(t);
  state.findUniqueResult = { id: 'u1', profile: { userId: 'u1' } };

  await ensureAppUserProvisioned(
    { id: 'u1', email: 'a@b.c' },
    { organizationId: ORG_A },
  );

  assert.equal(state.upserts.length, 0);
});

test('orphan provision writes the injected org, not a hardcoded default', async (t) => {
  const state = installProvisionMocks(t);
  state.findUniqueResult = null;

  await ensureAppUserProvisioned(
    { id: 'u-orphan', email: 'orphan@example.com', user_metadata: { full_name: 'Orphan' } },
    { organizationId: ORG_A },
  );

  assert.equal(state.upserts.length, 1);
  assert.equal(state.upserts[0].create.organizationId, ORG_A);
  assert.deepEqual(state.upserts[0].update, {});
});

test('existing user without profile is not moved to another org', async (t) => {
  const state = installProvisionMocks(t);
  state.findUniqueResult = { id: 'u1', profile: null };

  await ensureAppUserProvisioned(
    { id: 'u1', email: 'a@b.c' },
    { organizationId: DEFAULT_ORG },
  );

  assert.equal(state.upserts.length, 1);
  assert.deepEqual(state.upserts[0].update, {});
  assert.equal(state.upserts[0].create.organizationId, DEFAULT_ORG);
});
