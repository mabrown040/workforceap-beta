import test from 'node:test';
import assert from 'node:assert/strict';

import { requireAdmin, isAdmin } from './roles';
import { prisma } from '../db/prisma';

test('requireAdmin throws error when user is not admin', async (t) => {
  const originalFindUnique = prisma.profile.findUnique;
  const originalFindMany = prisma.userRole.findMany;

  t.after(() => {
    prisma.profile.findUnique = originalFindUnique;
    prisma.userRole.findMany = originalFindMany;
  });

  // Mock Prisma responses so user is not an admin
  prisma.profile.findUnique = async () => ({ role: 'member' } as any);
  prisma.userRole.findMany = async () => ([] as any[]);

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
  const originalFindUnique = prisma.profile.findUnique;
  const originalFindMany = prisma.userRole.findMany;

  t.after(() => {
    prisma.profile.findUnique = originalFindUnique;
    prisma.userRole.findMany = originalFindMany;
  });

  // Mock Prisma responses so user is an admin
  prisma.profile.findUnique = async () => ({ role: 'admin' } as any);
  prisma.userRole.findMany = async () => ([] as any[]);

  const isAdm = await isAdmin('user-1');
  assert.equal(isAdm, true);

  // Should not throw
  await requireAdmin('user-1');
});
