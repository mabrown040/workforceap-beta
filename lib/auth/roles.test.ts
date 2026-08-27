import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdmin, isAdmin, canBypassMemberAssessment, isSuperAdmin, isCounselor } from './roles';
import { prisma } from '../db/prisma';

test('requireAdmin throws error when user is not admin', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;

  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });

  // Mock Prisma responses so user is not an admin
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([] as any[]);

  // verify isAdmin returns false first
  const isAdm = await isAdmin('user-1');
  assert.equal(isAdm, false);

  // Verify requireAdmin throws the expected error
  await assert.rejects(
    requireAdmin('user-1'),
    new Error('Forbidden: admin access required')
  );
});

test('requireAdmin succeeds when user is admin', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;

  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });

  // Mock Prisma responses so user is an admin
  profileDelegate.findUnique = async () => ({ role: 'admin' } as any);
  userRoleDelegate.findMany = async () => ([] as any[]);

  const isAdm = await isAdmin('user-1');
  assert.equal(isAdm, true);

  // Should not throw
  await requireAdmin('user-1');
});

test('canBypassMemberAssessment is true for super_admin', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'super_admin' } as any);
  userRoleDelegate.findMany = async () => ([] as any[]);
  // Use a fresh userId — React `cache()` memoizes per-id within a request,
  // and Node test runs share that cache because `cache()` falls back to a
  // process-level memo outside a React render.
  assert.equal(await canBypassMemberAssessment('user-bypass-super'), true);
});

test('canBypassMemberAssessment is true for admin profile', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'admin' } as any);
  userRoleDelegate.findMany = async () => ([] as any[]);
  assert.equal(await canBypassMemberAssessment('user-bypass-admin'), true);
});

test('canBypassMemberAssessment is false for plain member', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([] as any[]);
  assert.equal(await canBypassMemberAssessment('user-bypass-member'), false);
});

test('isSuperAdmin is true when profile role is super_admin', async (t) => {
  const profileDelegate = prisma.profile as any;
  const originalFindUnique = profileDelegate.findUnique;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
  });
  profileDelegate.findUnique = async () => ({ role: 'super_admin' } as any);
  assert.equal(await isSuperAdmin('user-super-admin-profile'), true);
});

test('isSuperAdmin is true when UserRole grants super_admin even if profile is member', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([{ role: { name: 'super_admin' } }] as any[]);
  assert.equal(await isSuperAdmin('user-super-admin-userrole'), true);
});

test('isSuperAdmin is false for admin-only UserRole', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([{ role: { name: 'admin' } }] as any[]);
  assert.equal(await isSuperAdmin('user-admin-userrole-not-super'), false);
});

test('isAdmin is true when UserRole grants super_admin', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([{ role: { name: 'super_admin' } }] as any[]);
  assert.equal(await isAdmin('user-admin-via-super-userrole'), true);
});

test('canBypassMemberAssessment is true when super_admin via UserRole table', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([{ role: { name: 'super_admin' } }] as any[]);
  assert.equal(await canBypassMemberAssessment('user-bypass-userrole-super'), true);
});

test('isCounselor is true for super_admin without a counselor row', async (t) => {
  const profileDelegate = prisma.profile as any;
  const counselorDelegate = prisma.counselor as any;
  const originalProfileFind = profileDelegate.findUnique;
  const originalCounselorFind = counselorDelegate.findFirst;
  t.after(() => {
    profileDelegate.findUnique = originalProfileFind;
    counselorDelegate.findFirst = originalCounselorFind;
  });
  profileDelegate.findUnique = async () => ({ role: 'super_admin' } as any);
  counselorDelegate.findFirst = async () => null;
  assert.equal(await isCounselor('user-super-admin-counselor'), true);
});

test('canBypassMemberAssessment is true when admin via UserRole table', async (t) => {
  const profileDelegate = prisma.profile as any;
  const userRoleDelegate = prisma.userRole as any;
  const originalFindUnique = profileDelegate.findUnique;
  const originalFindMany = userRoleDelegate.findMany;
  t.after(() => {
    profileDelegate.findUnique = originalFindUnique;
    userRoleDelegate.findMany = originalFindMany;
  });
  profileDelegate.findUnique = async () => ({ role: 'member' } as any);
  userRoleDelegate.findMany = async () => ([{ role: { name: 'admin' } }] as any[]);
  assert.equal(await canBypassMemberAssessment('user-bypass-userrole-admin'), true);
});
