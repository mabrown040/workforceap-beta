// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
  org: vi.fn(),
  target: vi.fn(),
  sendReset: vi.fn(),
  audit: vi.fn(),
  event: vi.fn(),
}));

vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: mocks.isAdmin, isSuperAdmin: mocks.isSuperAdmin }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: mocks.org }));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: async (org: string, fn: (db: unknown) => Promise<unknown>) => {
    expect(org).toBe('org-1');
    return fn({ user: { findFirst: mocks.target } });
  },
}));
vi.mock('@/lib/auth/passwordReset', () => ({ sendPasswordResetEmail: mocks.sendReset }));
vi.mock('@/lib/audit', () => ({ auditLog: mocks.audit }));
vi.mock('@/lib/audit/log', () => ({ auditRequestMeta: () => ({}), logAuditEvent: mocks.event }));

import { POST } from '@/app/api/admin/users/[id]/reset-password/route';

const ACTOR = '10000000-0000-4000-8000-000000000001';
const TARGET = '20000000-0000-4000-8000-000000000001';
const request = () => new Request(`http://localhost/api/admin/users/${TARGET}/reset-password`, { method: 'POST' });
const context = () => ({ params: Promise.resolve({ id: TARGET }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: ACTOR });
  mocks.isAdmin.mockResolvedValue(true);
  mocks.isSuperAdmin.mockResolvedValue(false);
  mocks.org.mockResolvedValue('org-1');
  mocks.target.mockResolvedValue({
    email: 'member@example.test',
    profile: { role: 'member' },
    userRoles: [],
  });
  mocks.sendReset.mockResolvedValue({ error: null });
  mocks.audit.mockResolvedValue(undefined);
  mocks.event.mockResolvedValue(undefined);
});

const privilegedTargets = [
  { name: 'profile only', profile: { role: 'super_admin' }, userRoles: [] },
  { name: 'UserRole grant only', profile: null, userRoles: [{ role: { name: 'super_admin' } }] },
  { name: 'both stores privileged', profile: { role: 'super_admin' }, userRoles: [{ role: { name: 'super_admin' } }] },
  { name: 'stale privileged profile with ordinary grant', profile: { role: 'super_admin' }, userRoles: [{ role: { name: 'member' } }] },
  { name: 'stale ordinary profile with privileged grant', profile: { role: 'member' }, userRoles: [{ role: { name: 'super_admin' } }] },
  { name: 'privileged self', profile: { role: 'super_admin' }, userRoles: [], self: true },
] as const;

describe('POST /api/admin/users/[id]/reset-password', () => {
  it.each(privilegedTargets)('denies ordinary admin recovery for privileged target: $name', async ({ self, ...roles }) => {
    const targetId = self ? ACTOR : TARGET;
    mocks.target.mockResolvedValue({ email: 'owner@example.test', ...roles });

    const response = await POST(request(), { params: Promise.resolve({ id: targetId }) });

    expect(response.status).toBe(403);
    expect(mocks.target).toHaveBeenCalledWith({
      where: { id: targetId },
      select: expect.objectContaining({
        profile: { select: { role: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      }),
    });
    expect(mocks.sendReset).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.event).not.toHaveBeenCalled();
  });

  it('preserves ordinary same-tenant member recovery', async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    expect(mocks.sendReset).toHaveBeenCalledOnce();
  });

  it('preserves explicit super-admin authority over a privileged target', async () => {
    mocks.isSuperAdmin.mockResolvedValue(true);
    mocks.target.mockResolvedValue({
      email: 'owner@example.test',
      profile: { role: 'super_admin' },
      userRoles: [],
    });

    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    expect(mocks.sendReset).toHaveBeenCalledOnce();
  });

  it('does not send recovery when the tenant-scoped target is absent', async () => {
    mocks.target.mockResolvedValue(null);

    const response = await POST(request(), context());

    expect(response.status).toBe(404);
    expect(mocks.sendReset).not.toHaveBeenCalled();
  });
});
