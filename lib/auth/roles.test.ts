import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/db/prisma';
import { isSuperAdmin } from './roles';

describe('isSuperAdmin', () => {
  test('returns true for super_admin role', async () => {
    const originalFindUnique = prisma.profile.findUnique;
    prisma.profile.findUnique = async () => ({ role: 'super_admin' }) as any;

    try {
      const result = await isSuperAdmin('user_1');
      assert.equal(result, true);
    } finally {
      prisma.profile.findUnique = originalFindUnique;
    }
  });

  test('returns false for admin role', async () => {
    const originalFindUnique = prisma.profile.findUnique;
    prisma.profile.findUnique = async () => ({ role: 'admin' }) as any;

    try {
      const result = await isSuperAdmin('user_2');
      assert.equal(result, false);
    } finally {
      prisma.profile.findUnique = originalFindUnique;
    }
  });

  test('returns false for member role', async () => {
    const originalFindUnique = prisma.profile.findUnique;
    prisma.profile.findUnique = async () => ({ role: 'member' }) as any;

    try {
      const result = await isSuperAdmin('user_3');
      assert.equal(result, false);
    } finally {
      prisma.profile.findUnique = originalFindUnique;
    }
  });

  test('returns false when profile is not found', async () => {
    const originalFindUnique = prisma.profile.findUnique;
    prisma.profile.findUnique = async () => null as any;

    try {
      const result = await isSuperAdmin('user_4');
      assert.equal(result, false);
    } finally {
      prisma.profile.findUnique = originalFindUnique;
    }
  });
});
