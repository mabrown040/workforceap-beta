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
  getUser: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({ requireAdmin: vi.fn(), isSuperAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
const tenantUserFindFirst = vi.hoisted(() => vi.fn());
vi.mock('@/lib/tenant/withTenantScope', () => ({
  crossTenantOK: vi.fn((fn: () => unknown) => fn()),
  withTenantScope: vi.fn((_orgId: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({ user: { findFirst: tenantUserFindFirst } }),
  ),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findFirst: vi.fn() }, $transaction: vi.fn() },
}));
vi.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/lib/admin/adminUserProvisioning', () => ({
  ADMIN_USER_ROLES: ['member', 'staff', 'admin', 'super_admin'],
  ensureAppUser: vi.fn(), ensureProfileRole: vi.fn(), syncManagedUserRoles: vi.fn(),
}));
vi.mock('@/lib/auth/passwordReset', () => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock('@/lib/auth/supabaseAdminUsers', () => ({ findSupabaseAuthUserByEmail: vi.fn() }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn() }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn() }));

const { POST } = await import('@/app/api/admin/users/route');
const { getUser } = await import('@/lib/auth/server');
const { getActorOrganizationId } = await import('@/lib/tenant/organization');
const { prisma } = await import('@/lib/db/prisma');

const request = () => new Request('http://localhost/api/admin/users', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ fullName: 'New User', email: 'taken@example.test', role: 'member', sendResetEmail: false }),
});

describe('POST /api/admin/users duplicate response boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-a' } as never);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-a');
    tenantUserFindFirst.mockResolvedValue(null);
  });

  it('hides every foreign-tenant identifier and PII field', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'foreign-uuid', organizationId: 'org-b',
    } as never);
    const response = await POST(request() as never);
    const text = await response.text();
    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toEqual({ error: 'That email already has an account.' });
    for (const secret of ['foreign-uuid', 'Foreign Name', 'foreign@example.test', 'admin']) {
      expect(text).not.toContain(secret);
    }
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'taken@example.test' },
      select: { id: true, organizationId: true },
    });
    expect(tenantUserFindFirst).not.toHaveBeenCalled();
  });

  it('returns the authorized projection for an own-tenant duplicate', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'own-uuid', organizationId: 'org-a',
    } as never);
    tenantUserFindFirst.mockResolvedValue({
      id: 'own-uuid', fullName: 'Own Name', email: 'taken@example.test', profile: { role: 'member' },
    });
    const response = await POST(request() as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'That email already has an account. Use the edit or reset tools on the existing user.',
      user: { id: 'own-uuid', fullName: 'Own Name', email: 'taken@example.test', role: 'member' },
    });
  });
});
