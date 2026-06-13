import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request, context: unknown) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn((_orgId: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-1', email: 'old@example.com' }),
      },
    }),
  ),
}));

vi.mock('@/lib/admin/adminUserProvisioning', () => ({
  ADMIN_USER_ROLES: ['member', 'staff', 'admin', 'super_admin'],
  ensureProfileRole: vi.fn(),
  syncManagedUserRoles: vi.fn(),
}));

const updateUserById = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        updateUserById,
        deleteUser: vi.fn(),
      },
    },
  }),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { PATCH } from '@/app/api/admin/users/[id]/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

function patchReq(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/admin/users/user-1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isSuperAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(updateUserById).mockResolvedValue({ error: null });
  });

  it('rolls Supabase email back when the database transaction fails after auth update', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('db failed'));

    const res = await PATCH(
      patchReq({ fullName: 'User One', email: 'new@example.com', role: 'member' }),
      { params: Promise.resolve({ id: 'user-1' }) },
    );

    expect(res.status).toBe(500);
    expect(updateUserById).toHaveBeenCalledTimes(2);
    expect(updateUserById).toHaveBeenNthCalledWith(1, 'user-1', {
      email: 'new@example.com',
      email_confirm: true,
    });
    expect(updateUserById).toHaveBeenNthCalledWith(2, 'user-1', {
      email: 'old@example.com',
      email_confirm: true,
    });
  });
});
