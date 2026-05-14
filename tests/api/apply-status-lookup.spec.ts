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

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAuthRateLimit: vi.fn(),
}));

vi.mock('@/lib/member/memberApplicationStatus', () => ({
  applicationStatusForPublicLookup: vi.fn(),
}));

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

// ─── Imports after mocks ───
import { POST as statusLookup } from '@/app/api/apply/status-lookup/route';
import { prisma } from '@/lib/db/prisma';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { applicationStatusForPublicLookup } from '@/lib/member/memberApplicationStatus';

const makeRequest = (body: Record<string, unknown>): any =>
  new Request('http://localhost:3000/api/apply/status-lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/apply/status-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthRateLimit).mockResolvedValue({ success: true });
  });

  it('returns application status for existing email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'UNDER_REVIEW' } as any);
    vi.mocked(applicationStatusForPublicLookup).mockReturnValue('under_review');

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.status).toBe('under_review');
    expect(body.message).toContain('Under review');
  });

  it('returns not found when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await statusLookup(makeRequest({ email: 'nobody@example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.message).toContain('could not find an application');
  });

  it('returns not found when user exists but has no application', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.message).toContain('could not find an application');
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkAuthRateLimit).mockResolvedValue({ success: false });

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many requests');
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost:3000/api/apply/status-lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await statusLookup(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('returns 400 for invalid email', async () => {
    const res = await statusLookup(makeRequest({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('valid email');
  });

  it('returns 400 for missing email', async () => {
    const res = await statusLookup(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('valid email');
  });

  it('handles accepted status correctly', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'ACCEPTED' } as any);
    vi.mocked(applicationStatusForPublicLookup).mockReturnValue('accepted');

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.status).toBe('accepted');
    expect(body.message).toContain('Accepted');
  });

  it('handles rejected status correctly', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(prisma.application.findFirst).mockResolvedValue({ status: 'REJECTED' } as any);
    vi.mocked(applicationStatusForPublicLookup).mockReturnValue('rejected');

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.status).toBe('rejected');
    expect(body.message).toContain('closed');
  });

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB down'));

    const res = await statusLookup(makeRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
