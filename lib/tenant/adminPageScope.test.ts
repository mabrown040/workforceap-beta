import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../db/prisma';
import {
  inheritJobOrg,
  inheritMemberOrg,
  inheritUserOrg,
  resolveAdminPageTenant,
  withAdminPageScope,
} from './adminPageScope';

const orgAdminScope = { ok: true as const, orgId: 'org-a', superAdmin: false };
const superAdminScope = { ok: true as const, orgId: 'org-a', superAdmin: true };

test('inheritUserOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritUserOrg(superAdminScope), {});
  assert.deepEqual(inheritUserOrg(orgAdminScope), { user: { organizationId: 'org-a' } });
});

test('inheritMemberOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritMemberOrg(superAdminScope), {});
  assert.deepEqual(inheritMemberOrg(orgAdminScope), { member: { organizationId: 'org-a' } });
});

test('inheritJobOrg is empty for super-admin and filters for org admin', () => {
  assert.deepEqual(inheritJobOrg(superAdminScope), {});
  assert.deepEqual(inheritJobOrg(orgAdminScope), { job: { organizationId: 'org-a' } });
});

test('withAdminPageScope uses the unscoped client for super-admin', async () => {
  let seen: unknown;
  await withAdminPageScope(superAdminScope, async (db) => {
    seen = db;
    return 1;
  });
  assert.equal(seen, prisma);
});

test('withAdminPageScope injects organizationId on user.findMany for org admin', async () => {
  const orig = (prisma.user as { findMany: typeof prisma.user.findMany }).findMany;
  let received: unknown;
  (prisma.user as { findMany: (args: unknown) => Promise<unknown> }).findMany = async (args) => {
    received = args;
    return [];
  };
  try {
    await withAdminPageScope(orgAdminScope, async (db) => {
      await db.user.findMany({ where: { deletedAt: null } });
      return null;
    });
  } finally {
    (prisma.user as { findMany: typeof prisma.user.findMany }).findMany = orig;
  }
  assert.equal((received as { where: { organizationId: string } }).where.organizationId, 'org-a');
  assert.equal((received as { where: { deletedAt: null } }).where.deletedAt, null);
});

test('resolveAdminPageTenant rejects a member', async (t) => {
  const userDelegate = prisma.user as { findUnique: typeof prisma.user.findUnique };
  const profileDelegate = prisma.profile as { findUnique: typeof prisma.profile.findUnique };
  const origUser = userDelegate.findUnique;
  const origProfile = profileDelegate.findUnique;
  t.after(() => {
    userDelegate.findUnique = origUser;
    profileDelegate.findUnique = origProfile;
  });
  userDelegate.findUnique = (async () => ({ organizationId: 'org-a' })) as typeof userDelegate.findUnique;
  profileDelegate.findUnique = (async () => ({ role: 'member' })) as typeof profileDelegate.findUnique;

  const result = await resolveAdminPageTenant(`user-member-scope-${Date.now()}`);
  assert.equal(result.ok, false);
});

test('resolveAdminPageTenant accepts an org admin', async (t) => {
  const userDelegate = prisma.user as { findUnique: typeof prisma.user.findUnique };
  const profileDelegate = prisma.profile as { findUnique: typeof prisma.profile.findUnique };
  const origUser = userDelegate.findUnique;
  const origProfile = profileDelegate.findUnique;
  t.after(() => {
    userDelegate.findUnique = origUser;
    profileDelegate.findUnique = origProfile;
  });
  userDelegate.findUnique = (async () => ({ organizationId: 'org-a' })) as typeof userDelegate.findUnique;
  profileDelegate.findUnique = (async () => ({ role: 'admin' })) as typeof profileDelegate.findUnique;

  const result = await resolveAdminPageTenant(`user-admin-scope-${Date.now()}`);
  assert.deepEqual(result, { ok: true, orgId: 'org-a', superAdmin: false });
});

test('resolveAdminPageTenant accepts a super-admin (cross-tenant ops)', async (t) => {
  const userDelegate = prisma.user as { findUnique: typeof prisma.user.findUnique };
  const profileDelegate = prisma.profile as { findUnique: typeof prisma.profile.findUnique };
  const origUser = userDelegate.findUnique;
  const origProfile = profileDelegate.findUnique;
  t.after(() => {
    userDelegate.findUnique = origUser;
    profileDelegate.findUnique = origProfile;
  });
  userDelegate.findUnique = (async () => ({ organizationId: 'org-a' })) as typeof userDelegate.findUnique;
  profileDelegate.findUnique = (async () => ({ role: 'super_admin' })) as typeof profileDelegate.findUnique;

  const result = await resolveAdminPageTenant(`user-super-scope-${Date.now()}`);
  assert.deepEqual(result, { ok: true, orgId: 'org-a', superAdmin: true });
});
