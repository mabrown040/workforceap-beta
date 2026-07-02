import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  getEmployerForUser: vi.fn(),
  getPartnerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: { update: vi.fn() },
    employer: { update: vi.fn() },
    partner: { update: vi.fn() },
  },
}));

import { POST } from '@/app/api/onboarding/complete/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const req = (body: unknown) =>
  new Request('http://localhost:3000/api/onboarding/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'member' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    const res = await POST(req('not-json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid portal value', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    const res = await POST(req({ portal: 'admin' }));
    expect(res.status).toBe(400);
  });

  it('marks member onboarding complete', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'member' }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } })
    );
  });

  it('returns 403 when employer context missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'employer' }));
    expect(res.status).toBe(403);
  });

  it('marks employer onboarding complete when authorized', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'e1' } as any);
    vi.mocked(prisma.employer.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'employer' }));
    expect(res.status).toBe(200);
    expect(prisma.employer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } })
    );
  });

  it('returns 403 when partner context missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'partner' }));
    expect(res.status).toBe(403);
  });

  it('marks partner onboarding complete when authorized', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: 'p1' } as any);
    vi.mocked(prisma.partner.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'partner' }));
    expect(res.status).toBe(200);
    expect(prisma.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } })
    );
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('boom'));
    const res = await POST(req({ portal: 'member' }));
    expect(res.status).toBe(500);
  });
});
