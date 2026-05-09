import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdmin, isAdmin, canBypassMemberAssessment } from './roles';
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
