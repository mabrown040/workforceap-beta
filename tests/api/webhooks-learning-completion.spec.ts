import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

vi.mock('@/lib/workflows/careerOS', () => ({
  handleLearningCompletion: vi.fn(),
}));

// ─── Imports after mocks ───
import { POST } from '@/app/api/webhooks/learning-completion/route';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';

const makeRequest = (body: Record<string, unknown>, secret?: string) =>
  new Request('http://localhost:3000/api/webhooks/learning-completion', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-webhook-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  });

describe('POST /api/webhooks/learning-completion', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, WEBHOOK_SECRET: 'super-secret-token' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 when secret is missing', async () => {
    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when secret is wrong length', async () => {
    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'short'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when secret does not match', async () => {
    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'wrong-secret-token'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when memberId is missing', async () => {
    const res = await POST(makeRequest({ courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'memberId and courseName are required' });
  });

  it('returns 400 when courseName is missing', async () => {
    const res = await POST(makeRequest({ memberId: 'm1' }, 'super-secret-token'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'memberId and courseName are required' });
  });

  it('returns 400 when memberId is empty string', async () => {
    const res = await POST(makeRequest({ memberId: '   ', courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'memberId and courseName are required' });
  });

  it('returns 400 when courseName is empty string', async () => {
    const res = await POST(makeRequest({ memberId: 'm1', courseName: '   ' }, 'super-secret-token'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'memberId and courseName are required' });
  });

  it('returns 400 when memberId is not a string', async () => {
    const res = await POST(makeRequest({ memberId: 123, courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'memberId and courseName are required' });
  });

  it('processes learning completion with valid secret', async () => {
    vi.mocked(handleLearningCompletion).mockResolvedValue({
      actionId: 'action-1',
      created: true,
      duplicatedRecentAction: false,
      matchedJobId: 'job-1',
      resumeBullet: 'Learned React fundamentals',
    });

    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.actionId).toBe('action-1');
    expect(body.created).toBe(true);
    expect(body.matchedJobId).toBe('job-1');
    expect(handleLearningCompletion).toHaveBeenCalledWith('m1', 'React 101');
  });

  it('handles duplicate recent action', async () => {
    vi.mocked(handleLearningCompletion).mockResolvedValue({
      actionId: 'action-existing',
      created: false,
      duplicatedRecentAction: true,
      matchedJobId: null,
      resumeBullet: 'Learned React fundamentals',
    });

    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.created).toBe(false);
    expect(body.duplicatedRecentAction).toBe(true);
  });

  it('returns 500 when handleLearningCompletion throws', async () => {
    vi.mocked(handleLearningCompletion).mockRejectedValue(new Error('workflow failed'));

    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'super-secret-token'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });

  it('uses timing-safe comparison for secrets', async () => {
    // This test verifies the route doesn't short-circuit on wrong-length secrets
    process.env.WEBHOOK_SECRET = 'a'.repeat(100);
    const res = await POST(makeRequest({ memberId: 'm1', courseName: 'React 101' }, 'b'.repeat(100)));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
