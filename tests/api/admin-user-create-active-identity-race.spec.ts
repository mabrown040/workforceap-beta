import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json' } }),
  },
}));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(async () => ({ id: 'admin-a' })),
}));
vi.mock('@/lib/auth/roles', () => ({
  requireAdmin: vi.fn(),
  isSuperAdmin: vi.fn(async () => false),
}));
vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(async () => 'org-a'),
}));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  crossTenantOK: vi.fn((fn: () => unknown) => fn()),
  withTenantScope: vi.fn(),
}));

const effects = vi.hoisted(() => ({
  profile: vi.fn(),
  userRole: vi.fn(),
  reset: vi.fn(),
  audit: vi.fn(),
  auditEvent: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  createUser: vi.fn(),
  findByEmail: vi.fn(),
}));
const database = vi.hoisted(() => ({
  globalFind: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findFirst: database.globalFind }, $transaction: database.transaction },
}));
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ auth: { admin: { createUser: auth.createUser } } }),
}));
vi.mock('@/lib/auth/supabaseAdminUsers', () => ({
  findSupabaseAuthUserByEmail: auth.findByEmail,
}));
vi.mock('@/lib/auth/passwordReset', () => ({ sendPasswordResetEmail: effects.reset }));
vi.mock('@/lib/audit', () => ({ auditLog: effects.audit }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: effects.auditEvent }));

const { POST } = await import('@/app/api/admin/users/route');

type Identity = {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  deletedAt: Date | null;
};

function request() {
  return new Request('http://localhost/api/admin/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Loser Request',
      email: 'OWN@example.test',
      role: 'member',
      sendResetEmail: true,
    }),
  });
}

function transactionStore(initial: Identity, afterRead?: (identity: Identity) => void) {
  const identity = { ...initial };
  const tx = {
    user: {
      findFirst: vi.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) {
          const snapshot = { ...identity };
          afterRead?.(identity);
          return snapshot;
        }
        return where.email === identity.email ? { id: identity.id, organizationId: identity.organizationId } : null;
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { id: string; organizationId: string; email: string; deletedAt: null };
        data: { fullName: string };
      }) => {
        if (
          identity.id !== where.id ||
          identity.organizationId !== where.organizationId ||
          identity.email !== where.email ||
          identity.deletedAt !== where.deletedAt
        ) return { count: 0 };
        identity.fullName = data.fullName;
        return { count: 1 };
      }),
      create: vi.fn(),
    },
    profile: {
      findFirst: effects.profile,
      update: effects.profile,
      create: effects.profile,
    },
    role: { findFirst: effects.userRole, create: effects.userRole },
    userRole: { upsert: effects.userRole, deleteMany: effects.userRole },
  };
  database.transaction.mockImplementationOnce(async (fn: (client: typeof tx) => unknown) => fn(tx));
  return { identity, tx };
}

describe('POST /api/admin/users active identity race boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.globalFind.mockResolvedValue(null);
    auth.createUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'user_already_exists', message: 'already exists' },
    });
    auth.findByEmail.mockResolvedValue({ id: 'auth-own' });
  });

  it('rejects an already-retired identity as a generic conflict with no later effects', async () => {
    const { identity, tx } = transactionStore({
      id: 'auth-own',
      organizationId: 'org-a',
      email: 'own@example.test',
      fullName: 'Retired Private Name',
      deletedAt: new Date('2026-09-01T00:00:00Z'),
    });

    const response = await POST(request() as never);
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({ error: 'That email already has an account.' });
    expect(text).not.toContain('Retired Private Name');
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(identity.deletedAt).not.toBeNull();
    expect(effects.profile).not.toHaveBeenCalled();
    expect(effects.userRole).not.toHaveBeenCalled();
    expect(effects.reset).not.toHaveBeenCalled();
    expect(effects.audit).not.toHaveBeenCalled();
    expect(effects.auditEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['soft-delete', (identity: Identity) => { identity.deletedAt = new Date('2026-09-02T00:00:00Z'); }],
    ['organization change', (identity: Identity) => { identity.organizationId = 'org-b'; }],
    ['email change', (identity: Identity) => { identity.email = 'winner@example.test'; }],
  ])('returns a generic conflict when %s wins between read and mutation', async (_label, mutate) => {
    const { identity, tx } = transactionStore({
      id: 'auth-own',
      organizationId: 'org-a',
      email: 'own@example.test',
      fullName: 'Private Original',
      deletedAt: null,
    }, mutate);

    const response = await POST(request() as never);
    const text = await response.text();

    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({ error: 'That email already has an account.' });
    expect(text).not.toContain('Private Original');
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'auth-own', organizationId: 'org-a', email: 'own@example.test', deletedAt: null },
      data: { fullName: 'Loser Request' },
    });
    expect(identity.fullName).toBe('Private Original');
    expect(effects.profile).not.toHaveBeenCalled();
    expect(effects.userRole).not.toHaveBeenCalled();
    expect(effects.reset).not.toHaveBeenCalled();
    expect(effects.audit).not.toHaveBeenCalled();
    expect(effects.auditEvent).not.toHaveBeenCalled();
  });
});