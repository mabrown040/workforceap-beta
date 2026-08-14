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

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: any) => handler,
}));
vi.mock('@/lib/tokenizedLink', () => ({
  validateTokenizedLink: vi.fn(),
  consumeTokenizedLink: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkPublicQuestionnaireSubmitRateLimit: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn() }));
vi.mock('@/lib/audit/log', () => ({
  auditRequestMeta: vi.fn(() => ({})),
  logAuditEvent: vi.fn(async () => undefined),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { profile: { upsert: vi.fn() } },
}));

import { POST } from '@/app/api/consent/[token]/route';
import { validateTokenizedLink, consumeTokenizedLink } from '@/lib/tokenizedLink';
import { checkPublicQuestionnaireSubmitRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';

const postReq = (token: string, body: unknown) =>
  new Request(`http://localhost:3000/api/consent/${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  guardianName: 'Alex Guardian',
  guardianEmail: 'alex@example.com',
  guardianPhone: '5125550100',
  attested: true as const,
};

describe('POST /api/consent/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkPublicQuestionnaireSubmitRateLimit).mockResolvedValue({ success: true });
    vi.mocked(consumeTokenizedLink).mockResolvedValue(true);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);
  });

  it('returns 410 for an invalid token and never writes', async () => {
    vi.mocked(validateTokenizedLink).mockResolvedValue({ ok: false, reason: 'not_found' });
    const res = await POST(postReq('x'.repeat(32), validBody) as any, {
      params: Promise.resolve({ token: 'x'.repeat(32) }),
    });
    expect(res.status).toBe(410);
    expect(prisma.profile.upsert).not.toHaveBeenCalled();
  });

  it('consumes the token then records guardian consent on the bound member', async () => {
    vi.mocked(validateTokenizedLink).mockResolvedValue({
      ok: true,
      link: {
        id: 'link-1',
        type: 'guardian_consent',
        email: 'alex@example.com',
        subjectUserId: 'member-1',
        orgId: 'org-1',
      },
    });

    const res = await POST(postReq('tok-consent-1', validBody) as any, {
      params: Promise.resolve({ token: 'tok-consent-1' }),
    });
    expect(res.status).toBe(200);
    expect(consumeTokenizedLink).toHaveBeenCalledWith('link-1');
    expect(prisma.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'member-1' },
        create: expect.objectContaining({
          userId: 'member-1',
          isMinor: true,
          parentalConsentGiven: true,
          parentGuardianName: 'Alex Guardian',
          parentGuardianEmail: 'alex@example.com',
        }),
      }),
    );
  });

  it('rejects a submit that is not attested', async () => {
    vi.mocked(validateTokenizedLink).mockResolvedValue({
      ok: true,
      link: {
        id: 'link-1',
        type: 'guardian_consent',
        email: null,
        subjectUserId: 'member-1',
        orgId: 'org-1',
      },
    });
    const res = await POST(
      postReq('tok-consent-1', { ...validBody, attested: false }) as any,
      { params: Promise.resolve({ token: 'tok-consent-1' }) },
    );
    expect(res.status).toBe(400);
    expect(consumeTokenizedLink).not.toHaveBeenCalled();
  });
});
