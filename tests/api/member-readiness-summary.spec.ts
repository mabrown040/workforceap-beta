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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/ai/groq', () => ({
  chatCompletion: vi.fn(),
  isAIConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/readiness/score', () => ({
  getScoreBreakdownSafeResult: vi.fn(),
}));

import { POST } from '@/app/api/member/readiness/summary/route';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { getScoreBreakdownSafeResult } from '@/lib/readiness/score';
import { SCREENSHOT_86_BREAKDOWN } from '@/lib/readiness/progressView.fixtures';
import { READINESS_SCORE_LOAD_ERROR } from '@/lib/readiness/progressSummary';

describe('POST /api/member/readiness/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAIToolRateLimit).mockResolvedValue({ success: true });
    vi.mocked(isAIConfigured).mockReturnValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await POST(new Request('http://localhost/api/member/readiness/summary', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns an honest error recap when score load fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
    vi.mocked(getScoreBreakdownSafeResult).mockResolvedValue({
      breakdown: SCREENSHOT_86_BREAKDOWN,
      loadFailed: true,
    });

    const res = await POST(new Request('http://localhost/api/member/readiness/summary', { method: 'POST' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: 'error', summary: READINESS_SCORE_LOAD_ERROR });
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it('degrades to the factual recap when AI is unconfigured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
    vi.mocked(isAIConfigured).mockReturnValue(false);
    vi.mocked(getScoreBreakdownSafeResult).mockResolvedValue({
      breakdown: SCREENSHOT_86_BREAKDOWN,
      loadFailed: false,
    });

    const res = await POST(new Request('http://localhost/api/member/readiness/summary', { method: 'POST' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe('factual');
    expect(body.summary).toContain('86%');
    expect(body.summary).toContain('Apply to at least 3 jobs');
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it('returns grounded AI text when generation succeeds', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
    vi.mocked(getScoreBreakdownSafeResult).mockResolvedValue({
      breakdown: SCREENSHOT_86_BREAKDOWN,
      loadFailed: false,
    });
    vi.mocked(chatCompletion).mockResolvedValue(
      'Your readiness score is 86%. Resume and engagement are complete. Training is 60% and interviews are 83% because applications are still short of three. Next: apply to at least 3 jobs.',
    );

    const res = await POST(new Request('http://localhost/api/member/readiness/summary', { method: 'POST' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe('ai');
    expect(body.summary).toContain('86%');
  });

  it('falls back to factual recap when the model invents a score', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as never);
    vi.mocked(getScoreBreakdownSafeResult).mockResolvedValue({
      breakdown: SCREENSHOT_86_BREAKDOWN,
      loadFailed: false,
    });
    vi.mocked(chatCompletion).mockResolvedValue('You are 99% ready and already placed at Acme.');

    const res = await POST(new Request('http://localhost/api/member/readiness/summary', { method: 'POST' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe('factual');
    expect(body.summary).toContain('86 of 105 weighted points');
    expect(body.summary).not.toContain('Acme');
  });
});
