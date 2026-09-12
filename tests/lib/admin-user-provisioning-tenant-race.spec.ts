import { describe, expect, it, vi } from 'vitest';
import { ensureAppUser } from '@/lib/admin/adminUserProvisioning';

function txWithUser(existing: { id: string; organizationId: string; email: string; deletedAt: Date | null } | null) {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(existing),
      update: vi.fn(),
      create: vi.fn(),
    },
    profile: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    role: { findFirst: vi.fn(), create: vi.fn() },
    userRole: { upsert: vi.fn(), deleteMany: vi.fn() },
  };
}

describe('ensureAppUser tenant race boundary', () => {
  it('refuses a reused Auth id owned by another tenant before any mutation', async () => {
    const tx = txWithUser({ id: 'auth-shared', organizationId: 'org-b', email: 'taken@example.test', deletedAt: null });

    await expect(ensureAppUser(tx as never, {
      authUserId: 'auth-shared', organizationId: 'org-a', email: 'taken@example.test', fullName: 'Loser Request',
    })).rejects.toThrow('ADMIN_USER_AUTH_IDENTITY_CONFLICT');

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.profile.findFirst).not.toHaveBeenCalled();
    expect(tx.userRole.upsert).not.toHaveBeenCalled();
  });

  it('does not rewrite organization or email when the same tenant resumes its identity', async () => {
    const tx = txWithUser({ id: 'auth-own', organizationId: 'org-a', email: 'own@example.test', deletedAt: null });
    tx.user.update.mockResolvedValue({ id: 'auth-own', fullName: 'Own User', email: 'own@example.test' });

    await ensureAppUser(tx as never, {
      authUserId: 'auth-own', organizationId: 'org-a', email: 'OWN@example.test', fullName: 'Own User',
    });

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'auth-own' },
      data: { fullName: 'Own User', deletedAt: null },
    }));
  });
});
