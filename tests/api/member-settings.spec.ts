import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
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
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: {
      update: vi.fn(),
    },
  },
}));

// ─── Imports after mocks ───
import { PATCH as settingsPATCH } from '@/app/api/member/settings/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const makeRequest = (body: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/member/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('PATCH /api/member/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates notification preferences for authenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-123' } as any);

    const res = await settingsPATCH(makeRequest({ notificationsUpdates: true, notificationsReminders: false }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: { notificationsUpdates: true, notificationsReminders: false },
      })
    );
  });

  it('updates only notificationsUpdates when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-123' } as any);

    const res = await settingsPATCH(makeRequest({ notificationsUpdates: false }));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: { notificationsUpdates: false },
      })
    );
  });

  it('updates only notificationsReminders when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-123' } as any);

    const res = await settingsPATCH(makeRequest({ notificationsReminders: true }));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: { notificationsReminders: true },
      })
    );
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await settingsPATCH(makeRequest({ notificationsUpdates: true }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);

    const req = new Request('http://localhost:3000/api/member/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await settingsPATCH(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('returns 400 when no valid fields provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);

    const res = await settingsPATCH(makeRequest({ someOtherField: true }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No valid fields to update' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 when body is empty object', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);

    const res = await settingsPATCH(makeRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No valid fields to update' });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB error'));

    const res = await settingsPATCH(makeRequest({ notificationsUpdates: true }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
