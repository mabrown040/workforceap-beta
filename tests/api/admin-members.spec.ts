import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
  NextRequest: class extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isSuperAdmin: vi.fn(() => Promise.resolve(false)), requireAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string, fn: (db: any) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: {
      findMany: vi.fn(),
    },
  },
}));

// ─── Imports after mocks ───
import { GET } from '@/app/api/admin/members/route';
import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

const makeRequest = (url: string) => new NextRequest(url, { method: 'GET' });

describe('GET /api/admin/members', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new Error('not admin'));

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns member list for admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'm1', fullName: 'Alice', email: 'alice@example.com' },
      { id: 'm2', fullName: 'Bob', email: 'bob@example.com' },
    ] as any);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].fullName).toBe('Alice');
    expect(body[1].email).toBe('bob@example.com');
  });

  it('filters by search query', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'm1', fullName: 'Alice', email: 'alice@example.com' },
    ] as any);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members?q=alice'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].fullName).toBe('Alice');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { fullName: { contains: 'alice', mode: 'insensitive' } },
            { email: { contains: 'alice', mode: 'insensitive' } },
          ],
        }),
      })
    );
  });

  it('respects limit param', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members?limit=10'));
    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it('caps limit at 100', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members?limit=500'));
    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('filters by role param', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members?role=admin'));
    expect(res.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          profile: { role: 'admin' },
        }),
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-123', email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
    vi.mocked(getActorOrganizationId).mockRejectedValue(new Error('org lookup failed'));

    const res = await GET(makeRequest('http://localhost:3000/api/admin/members'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
