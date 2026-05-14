import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getGucContext,
  ANONYMOUS_GUC_CONTEXT,
  SYSTEM_GUC_CONTEXT,
} from './gucContext';
import {
  withUserGuc,
  withSystemGuc,
  withAnonymousGuc,
} from './withRequestGuc';

test('withUserGuc sets authenticated context', async () => {
  const user = { id: 'user-123' } as any;
  await withUserGuc(user, async () => {
    const ctx = getGucContext();
    assert.equal(ctx?.userId, 'user-123');
    assert.equal(ctx?.role, 'anonymous'); // no profileRole provided
  });
});

test('withUserGuc sets role when profileRole provided', async () => {
  const user = { id: 'user-456' } as any;
  await withUserGuc(user, async () => {
    const ctx = getGucContext();
    assert.equal(ctx?.role, 'admin');
  }, { profileRole: 'admin' });
});

test('withUserGuc falls back to anonymous for null user', async () => {
  await withUserGuc(null, async () => {
    const ctx = getGucContext();
    assert.equal(ctx?.role, 'anonymous');
    assert.equal(ctx?.userId, null);
  });
});

test('withSystemGuc sets system context', async () => {
  await withSystemGuc(async () => {
    const ctx = getGucContext();
    assert.deepEqual(ctx, SYSTEM_GUC_CONTEXT);
  });
});

test('withAnonymousGuc sets anonymous context', async () => {
  await withAnonymousGuc(async () => {
    const ctx = getGucContext();
    assert.deepEqual(ctx, ANONYMOUS_GUC_CONTEXT);
  });
});

test('withUserGuc includes orgId, employerId, partnerId', async () => {
  const user = { id: 'user-789' } as any;
  await withUserGuc(
    user,
    async () => {
      const ctx = getGucContext();
      assert.equal(ctx?.orgId, 'org-1');
      assert.equal(ctx?.employerId, 'emp-1');
      assert.equal(ctx?.partnerId, 'par-1');
    },
    { orgId: 'org-1', employerId: 'emp-1', partnerId: 'par-1' }
  );
});
