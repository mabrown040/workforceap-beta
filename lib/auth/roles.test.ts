import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdmin, isAdmin } from './roles';
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
