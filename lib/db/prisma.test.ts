import test from 'node:test';
import assert from 'node:assert/strict';

import { getGucContext, runWithGucContext, inTransactionStorage, buildGucContext, ANONYMOUS_GUC_CONTEXT } from './gucContext';
import { buildGucSql, requiresExplicitTransactionForGucContext } from './prisma';

test('buildGucSql generates set_config statements', () => {
  const ctx = {
    userId: 'u-1',
    orgId: 'o-1',
    role: 'admin' as const,
    employerId: 'e-1',
    partnerId: 'p-1',
  };
  const sql = buildGucSql(ctx);
  assert.ok(sql.includes("set_config('app.current_user_id', 'u-1', true)"));
  assert.ok(sql.includes("set_config('app.current_org_id', 'o-1', true)"));
  assert.ok(sql.includes("set_config('app.current_role', 'admin', true)"));
  assert.ok(sql.includes("set_config('app.current_employer_id', 'e-1', true)"));
  assert.ok(sql.includes("set_config('app.current_partner_id', 'p-1', true)"));
});

test('buildGucSql handles anonymous context', () => {
  const sql = buildGucSql({ userId: null, orgId: null, role: 'anonymous' });
  assert.ok(sql.includes("set_config('app.current_user_id', '', true)"));
  assert.ok(sql.includes("set_config('app.current_org_id', '', true)"));
  assert.ok(sql.includes("set_config('app.current_role', 'anonymous', true)"));
});

test('buildGucSql handles system context', () => {
  const sql = buildGucSql({ userId: null, orgId: null, role: 'system' });
  assert.ok(sql.includes("set_config('app.current_role', 'system', true)"));
});

test('inTransactionStorage propagates across await boundaries', async () => {
  await inTransactionStorage.run(true, async () => {
    assert.equal(inTransactionStorage.getStore(), true);
    await Promise.resolve();
    assert.equal(inTransactionStorage.getStore(), true);
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.equal(inTransactionStorage.getStore(), true);
  });
});

test('runWithGucContext works alongside inTransactionStorage', async () => {
  const ctx = { userId: 'u-1', orgId: 'o-1', role: 'member' as const };
  await runWithGucContext(ctx, async () => {
    await inTransactionStorage.run(true, async () => {
      assert.deepEqual(getGucContext(), ctx);
      assert.equal(inTransactionStorage.getStore(), true);
    });
  });
});

test('active GUC context requires explicit transaction for Prisma operations', async () => {
  const ctx = { userId: 'u-1', orgId: 'o-1', role: 'member' as const };
  await runWithGucContext(ctx, async () => {
    assert.equal(requiresExplicitTransactionForGucContext(getGucContext(), false), true);
    assert.equal(requiresExplicitTransactionForGucContext(getGucContext(), true), false);
  });
});

test('missing GUC context does not require explicit transaction', () => {
  assert.equal(requiresExplicitTransactionForGucContext(getGucContext(), false), false);
});

test('buildGucContext maps forwarded user to member role by default', () => {
  const ctx = buildGucContext({ userId: 'fwd-user-1', orgId: null });
  assert.equal(ctx.userId, 'fwd-user-1');
  assert.equal(ctx.role, 'anonymous');
});

test('buildGucContext maps admin profileRole', () => {
  const ctx = buildGucContext({ userId: 'fwd-user-2', orgId: 'o-2', profileRole: 'admin' });
  assert.equal(ctx.role, 'admin');
  assert.equal(ctx.orgId, 'o-2');
});

test('ANONYMOUS_GUC_CONTEXT produces empty GUC sql', () => {
  const sql = buildGucSql(ANONYMOUS_GUC_CONTEXT);
  assert.ok(sql.includes("set_config('app.current_user_id', '', true)"));
  assert.ok(sql.includes("set_config('app.current_org_id', '', true)"));
  assert.ok(sql.includes("set_config('app.current_role', 'anonymous', true)"));
});
