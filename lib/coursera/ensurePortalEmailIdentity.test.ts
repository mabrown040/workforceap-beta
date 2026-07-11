import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensurePortalEmailIdentityLink,
  type EnsurePortalEmailIdentityDeps,
} from './ensurePortalEmailIdentity';

function makeDeps(overrides: Partial<EnsurePortalEmailIdentityDeps> = {}): EnsurePortalEmailIdentityDeps {
  return {
    listMappings: async () => [],
    upsertMapping: async () => ({ id: 'm1' }),
    backfill: async () => ({ courseRowsUpdated: 2, badgeRowsUpdated: 1 }),
    replayXapi: async () => ({ replayed: 3 }),
    ...overrides,
  };
}

test('ensurePortalEmailIdentityLink returns early for missing email', async () => {
  const upsertCalls: unknown[] = [];
  const result = await ensurePortalEmailIdentityLink(
    { userId: 'u1', email: null },
    makeDeps({
      upsertMapping: async (args) => {
        upsertCalls.push(args);
        return { id: 'm1' };
      },
    }),
  );
  assert.equal(result.reason, 'no valid email');
  assert.equal(upsertCalls.length, 0);
});

test('ensurePortalEmailIdentityLink upserts when unbound, then backfills + replays', async () => {
  const upsertArgs: unknown[] = [];
  const backfillArgs: unknown[] = [];
  const replayArgs: unknown[] = [];

  const result = await ensurePortalEmailIdentityLink(
    { userId: 'u1', email: 'Member@Example.com', orgId: 'org-1' },
    makeDeps({
      upsertMapping: async (args) => {
        upsertArgs.push(args);
        return { id: 'm1' };
      },
      backfill: async (email, userId) => {
        backfillArgs.push([email, userId]);
        return { courseRowsUpdated: 2, badgeRowsUpdated: 1 };
      },
      replayXapi: async (args) => {
        replayArgs.push(args);
        return { replayed: 3 };
      },
    }),
  );

  assert.equal(upsertArgs.length, 1);
  assert.deepEqual(upsertArgs[0], {
    userId: 'u1',
    courseraEmail: 'member@example.com',
    source: 'portal-email-auto',
    notes: 'Auto-linked from portal email on dashboard visit',
    expectedOrganizationId: 'org-1',
  });
  assert.deepEqual(backfillArgs[0], ['member@example.com', 'u1']);
  assert.deepEqual(replayArgs[0], { courseraEmail: 'member@example.com' });
  assert.equal(result.mappingCreatedOrUpdated, true);
  assert.equal(result.backfill.courseRowsUpdated, 2);
  assert.equal(result.xapiReplayed, 3);
});

test('ensurePortalEmailIdentityLink skips upsert when mapping exists', async () => {
  let upsertCalled = false;
  const result = await ensurePortalEmailIdentityLink(
    { userId: 'u1', email: 'member@example.com' },
    makeDeps({
      listMappings: async () => [{ courseraEmail: 'member@example.com' }],
      upsertMapping: async () => {
        upsertCalled = true;
        return { id: 'm1' };
      },
    }),
  );

  assert.equal(upsertCalled, false);
  assert.equal(result.mappingCreatedOrUpdated, false);
  assert.match(result.reason, /existing mapping/);
});
