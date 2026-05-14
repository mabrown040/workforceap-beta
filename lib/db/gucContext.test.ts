import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getGucContext,
  runWithGucContext,
  mapProfileRoleToRlsRole,
  buildGucContext,
  ANONYMOUS_GUC_CONTEXT,
  SYSTEM_GUC_CONTEXT,
  inTransactionStorage,
} from './gucContext';
import { buildGucSql } from './prisma';

test('getGucContext returns undefined outside runWithGucContext', () => {
  assert.equal(getGucContext(), undefined);
});

test('runWithGucContext makes context available inside callback', async () => {
  const ctx = { userId: 'user-1', orgId: 'org-1', role: 'member' as const };
  await runWithGucContext(ctx, async () => {
    assert.deepEqual(getGucContext(), ctx);
  });
});

test('runWithGucContext restores previous context after nested call', async () => {
  const outer = { userId: 'outer', orgId: 'org-1', role: 'admin' as const };
  const inner = { userId: 'inner', orgId: 'org-2', role: 'member' as const };

  await runWithGucContext(outer, async () => {
    assert.deepEqual(getGucContext(), outer);
    await runWithGucContext(inner, async () => {
      assert.deepEqual(getGucContext(), inner);
    });
    assert.deepEqual(getGucContext(), outer);
  });
});

test('mapProfileRoleToRlsRole maps all WAP roles', () => {
  assert.equal(mapProfileRoleToRlsRole('member'), 'member');
  assert.equal(mapProfileRoleToRlsRole('admin'), 'admin');
  assert.equal(mapProfileRoleToRlsRole('counselor'), 'counselor');
  assert.equal(mapProfileRoleToRlsRole('partner'), 'partner');
  assert.equal(mapProfileRoleToRlsRole('employer'), 'employer');
  assert.equal(mapProfileRoleToRlsRole('super_admin'), 'super_admin');
});

test('mapProfileRoleToRlsRole returns anonymous for unknown roles', () => {
  assert.equal(mapProfileRoleToRlsRole('hacker'), 'anonymous');
  assert.equal(mapProfileRoleToRlsRole(''), 'anonymous');
  assert.equal(mapProfileRoleToRlsRole(null), 'anonymous');
  assert.equal(mapProfileRoleToRlsRole(undefined), 'anonymous');
});

test('buildGucContext uses provided values', () => {
  const ctx = buildGucContext({
    userId: 'u-1',
    orgId: 'o-1',
    profileRole: 'admin',
    employerId: 'e-1',
    partnerId: 'p-1',
  });
  assert.equal(ctx.userId, 'u-1');
  assert.equal(ctx.orgId, 'o-1');
  assert.equal(ctx.role, 'admin');
  assert.equal(ctx.employerId, 'e-1');
  assert.equal(ctx.partnerId, 'p-1');
});

test('buildGucContext defaults to anonymous for null profileRole', () => {
  const ctx = buildGucContext({ userId: null, orgId: null });
  assert.equal(ctx.role, 'anonymous');
  assert.equal(ctx.userId, null);
  assert.equal(ctx.orgId, null);
});

test('ANONYMOUS_GUC_CONTEXT has expected shape', () => {
  assert.deepEqual(ANONYMOUS_GUC_CONTEXT, {
    userId: null,
    orgId: null,
    role: 'anonymous',
  });
});

test('SYSTEM_GUC_CONTEXT has expected shape', () => {
  assert.deepEqual(SYSTEM_GUC_CONTEXT, {
    userId: null,
    orgId: null,
    role: 'system',
  });
});

test('buildGucSql escapes single quotes', () => {
  const ctx = {
    userId: "user'or'1'='1",
    orgId: 'org-1',
    role: 'member' as const,
  };
  const sql = buildGucSql(ctx);
  assert.ok(!sql.includes("user'or'1'='1"));
  assert.ok(sql.includes("user''or''1''=''1"));
});

test('buildGucSql includes employerId and partnerId when present', () => {
  const ctx = {
    userId: 'u-1',
    orgId: 'o-1',
    role: 'employer' as const,
    employerId: 'e-1',
    partnerId: 'p-1',
  };
  const sql = buildGucSql(ctx);
  assert.ok(sql.includes("app.current_employer_id = 'e-1'"));
  assert.ok(sql.includes("app.current_partner_id = 'p-1'"));
});

test('buildGucSql omits employerId and partnerId when absent', () => {
  const ctx = {
    userId: 'u-1',
    orgId: 'o-1',
    role: 'member' as const,
  };
  const sql = buildGucSql(ctx);
  assert.ok(!sql.includes('app.current_employer_id'));
  assert.ok(!sql.includes('app.current_partner_id'));
});

test('buildGucSql sets empty strings for null userId/orgId', () => {
  const sql = buildGucSql(ANONYMOUS_GUC_CONTEXT);
  assert.ok(sql.includes("app.current_user_id = ''"));
  assert.ok(sql.includes("app.current_org_id = ''"));
  assert.ok(sql.includes("app.current_role = 'anonymous'"));
});

test('inTransactionStorage defaults to undefined', () => {
  assert.equal(inTransactionStorage.getStore(), undefined);
});

test('inTransactionStorage stores boolean flag', async () => {
  await inTransactionStorage.run(true, async () => {
    assert.equal(inTransactionStorage.getStore(), true);
  });
});
