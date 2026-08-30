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
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/ensureUser', () => ({
  ensureUserInDb: vi.fn(async () => undefined),
}));

vi.mock('@/lib/ai/saveResult', () => ({
  saveAIToolResult: vi.fn(),
}));

vi.mock('@/lib/member/points', () => ({
  awardPoints: vi.fn(async () => undefined),
}));

vi.mock('@/lib/ai/anthropicChat', () => ({
  claudeChat: vi.fn(async () => '["Open My Program and finish the next lesson."]'),
}));

vi.mock('@/lib/coach/memory', () => ({
  updateCoachMemory: vi.fn(async () => undefined),
}));

vi.mock('@/lib/ai/postProcess', () => ({
  cleanSpokenLine: (value: string) => value,
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string, callback: (db: unknown) => unknown) => callback({
    user: { findFirst: vi.fn(async () => null) },
  })),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(async () => 'org-1'),
}));

vi.mock('@/lib/email', () => ({
  getVoiceCoachTranscriptRecipients: vi.fn(() => []),
  sendVoiceCoachTranscriptEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(async () => ({ success: true })),
}));

import { POST } from '@/app/api/counselor/feedback/route';
import { getUser } from '@/lib/auth/server';
import { saveAIToolResult } from '@/lib/ai/saveResult';

function request(transcript: unknown): Request {
  return new Request('http://localhost/api/counselor/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
}

describe('POST /api/counselor/feedback persistence contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'member-1', email: 'ada@example.com' } as never);
    vi.mocked(saveAIToolResult).mockResolvedValue('result-1');
  });

  it('returns saved false and no plan when no transcript was captured', async () => {
    const response = await POST(request([]) as never);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({ saved: false, steps: [] });
    expect(body.error).toMatch(/no conversation transcript was captured/i);
    expect(saveAIToolResult).not.toHaveBeenCalled();
  });

  it('returns saved false and no plan when persistence fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(saveAIToolResult).mockRejectedValueOnce(new Error('database unavailable'));

    const response = await POST(request([
      { role: 'user', text: 'I need help with training.' },
      { role: 'agent', text: 'Let us pick one next step.' },
    ]) as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.saved).toBe(false);
    expect(body.steps).toBeUndefined();
    expect(body.error).toMatch(/transcript could not be saved/i);
    expect(consoleError).toHaveBeenCalledWith(
      'Lilley feedback persistence error:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('returns a plan only with an explicit saved true result', async () => {
    const response = await POST(request([
      { role: 'user', text: 'I want to continue training.' },
    ]) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      saved: true,
      steps: ['Open My Program and finish the next lesson.'],
    });
    expect(saveAIToolResult).toHaveBeenCalledOnce();
  });
});
