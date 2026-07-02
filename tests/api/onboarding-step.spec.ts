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

import { POST } from '@/app/api/onboarding/step/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser, getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const req = (body: unknown) =>
  new Request('http://localhost:3000/api/onboarding/step', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/onboarding/step', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'member', step: 2 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    const res = await POST(req('not-json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid portal value', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    const res = await POST(req({ portal: 'admin', step: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for step out of range', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    const res = await POST(req({ portal: 'member', step: 100 }));
    expect(res.status).toBe(400);
  });

  it('persists member step to user record', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'member', step: 2 }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { onboardingCurrentStep: 2 },
      })
    );
  });

  it('persists member step 0 (restart)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'member', step: 0 }));
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { onboardingCurrentStep: 0 },
      })
    );
  });

  it('returns 403 when employer context missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'employer', step: 1 }));
    expect(res.status).toBe(403);
  });

  it('persists employer step when authorized', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'e1' } as any);
    vi.mocked(prisma.employer.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'employer', step: 3 }));
    expect(res.status).toBe(200);
    expect(prisma.employer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'e1' },
        data: { onboardingCurrentStep: 3 },
      })
    );
  });

  it('returns 403 when partner context missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue(null);
    const res = await POST(req({ portal: 'partner', step: 1 }));
    expect(res.status).toBe(403);
  });

  it('persists partner step when authorized', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(getPartnerForUser).mockResolvedValue({ partnerId: 'p1' } as any);
    vi.mocked(prisma.partner.update).mockResolvedValue({} as any);
    const res = await POST(req({ portal: 'partner', step: 2 }));
    expect(res.status).toBe(200);
    expect(prisma.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { onboardingCurrentStep: 2 },
      })
    );
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('boom'));
    const res = await POST(req({ portal: 'member', step: 1 }));
    expect(res.status).toBe(500);
  });

  it('handles sendBeacon blob body (no content-type header)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    // Use Node's Blob: the jsdom-realm global Blob is not recognized by the
    // Node (undici) Request, which would stringify it as "[object Blob]".
    const { Blob: NodeBlob } = await import('node:buffer');
    const blob = new NodeBlob([JSON.stringify({ portal: 'member', step: 2 })], { type: 'application/json' });
    const res = await POST(
      new Request('http://localhost:3000/api/onboarding/step', {
        method: 'POST',
        // Node's buffer.Blob vs the DOM Blob type mismatch is a lib-typing
        // artifact; undici accepts it at runtime.
        body: blob as unknown as globalThis.Blob,
      })
    );
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: { onboardingCurrentStep: 2 },
      })
    );
  });
});
