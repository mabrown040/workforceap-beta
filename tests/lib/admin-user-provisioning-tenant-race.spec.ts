import { describe, expect, it, vi } from 'vitest';
import { ensureAppUser } from '@/lib/admin/adminUserProvisioning';

function txWithUser(existing: { id: string; organizationId: string; email: string; deletedAt: Date | null } | null) {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(existing),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
    },
    profile: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    role: { findFirst: vi.fn(), create: vi.fn() },
    userRole: { upsert: vi.fn(), deleteMany: vi.fn() },
  };
}

function transactionStore(existing: {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  deletedAt: Date | null;
}, afterInitialRead?: (user: typeof existing) => void) {
  const store = { user: { ...existing } };
  const tx = {
    user: {
      findFirst: vi.fn(async () => {
        const snapshot = { ...store.user };
        afterInitialRead?.(store.user);
        return snapshot;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { id: string; organizationId: string; email: string; deletedAt: null };
        data: { fullName: string };
      }) => {
        if (
          store.user.id !== where.id ||
          store.user.organizationId !== where.organizationId ||
          store.user.email !== where.email ||
          store.user.deletedAt !== where.deletedAt
        ) return { count: 0 };
        store.user.fullName = data.fullName;
        return { count: 1 };
      }),
      // Keep the pre-fix mutation available so this stateful store exposes an
      // implicit restore instead of failing because a mock method is missing.
      update: vi.fn(async ({ data }: {
        data: { fullName: string; deletedAt: Date | null };
      }) => {
        store.user.fullName = data.fullName;
        store.user.deletedAt = data.deletedAt;
        return { id: store.user.id, fullName: store.user.fullName, email: store.user.email };
      }),
      create: vi.fn(),
    },
  };
  return { store, tx };
}

describe('ensureAppUser tenant race boundary', () => {
  it('rejects an already-retired same-tenant identity without restoring it', async () => {
    const retiredAt = new Date('2026-09-01T00:00:00Z');
    const { store, tx } = transactionStore({
      id: 'auth-retired',
      organizationId: 'org-a',
      email: 'retired@example.test',
      fullName: 'Retired User',
      deletedAt: retiredAt,
    });

    await expect(ensureAppUser(tx as never, {
      authUserId: 'auth-retired',
      organizationId: 'org-a',
      email: 'retired@example.test',
      fullName: 'Implicit Restore',
    })).rejects.toThrow('ADMIN_USER_AUTH_IDENTITY_CONFLICT');

    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(store.user.deletedAt).toEqual(retiredAt);
    expect(store.user.fullName).toBe('Retired User');
  });

  it('refuses a reused Auth id owned by another tenant before any mutation', async () => {
    const tx = txWithUser({ id: 'auth-shared', organizationId: 'org-b', email: 'taken@example.test', deletedAt: null });

    await expect(ensureAppUser(tx as never, {
      authUserId: 'auth-shared', organizationId: 'org-a', email: 'taken@example.test', fullName: 'Loser Request',
    })).rejects.toThrow('ADMIN_USER_AUTH_IDENTITY_CONFLICT');

    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.profile.findFirst).not.toHaveBeenCalled();
    expect(tx.userRole.upsert).not.toHaveBeenCalled();
  });

  it('updates an active same-tenant identity using every expected identity field', async () => {
    const tx = txWithUser({ id: 'auth-own', organizationId: 'org-a', email: 'own@example.test', deletedAt: null });

    const result = await ensureAppUser(tx as never, {
      authUserId: 'auth-own', organizationId: 'org-a', email: 'OWN@example.test', fullName: 'Own User',
    });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'auth-own', organizationId: 'org-a', email: 'own@example.test', deletedAt: null },
      data: { fullName: 'Own User' },
    });
    expect(result).toEqual({ id: 'auth-own', fullName: 'Own User', email: 'own@example.test' });
  });

  it('creates a new identity with its normalized email', async () => {
    const tx = txWithUser(null);
    tx.user.create.mockResolvedValue({
      id: 'auth-new', fullName: 'New User', email: 'new@example.test',
    });

    const result = await ensureAppUser(tx as never, {
      authUserId: 'auth-new', organizationId: 'org-a', email: 'NEW@example.test', fullName: 'New User',
    });

    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        id: 'auth-new', organizationId: 'org-a', email: 'new@example.test', fullName: 'New User',
      },
      select: { id: true, fullName: true, email: true },
    });
    expect(result).toEqual({ id: 'auth-new', fullName: 'New User', email: 'new@example.test' });
  });

  it.each([
    ['soft-deletion', (user: { deletedAt: Date | null }) => { user.deletedAt = new Date('2026-09-02T00:00:00Z'); }],
    ['organization takeover', (user: { organizationId: string }) => { user.organizationId = 'org-b'; }],
    ['email takeover', (user: { email: string }) => { user.email = 'winner@example.test'; }],
  ])('rejects %s between read and write without changing the winner', async (_label, mutate) => {
    const { store, tx } = transactionStore({
      id: 'auth-own', organizationId: 'org-a', email: 'own@example.test', fullName: 'Original', deletedAt: null,
    }, mutate);
    await expect(ensureAppUser(tx as never, {
      authUserId: 'auth-own', organizationId: 'org-a', email: 'own@example.test', fullName: 'Loser',
    })).rejects.toThrow('ADMIN_USER_AUTH_IDENTITY_CONFLICT');

    expect(tx.user.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(store.user.fullName).toBe('Original');
  });
});
