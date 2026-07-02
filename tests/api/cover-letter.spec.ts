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
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/ensureUser', () => ({
  ensureUserInDb: vi.fn(async () => undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/ai/groq', () => ({
  chatCompletion: vi.fn(async () => 'Dear Hiring Manager,\n\nGenerated cover letter body.'),
  isAIConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/ai/saveResult', () => ({
  saveAIToolResult: vi.fn(async () => undefined),
}));

vi.mock('@/lib/auth/actAsSubject', () => ({
  resolveActOnBehalf: vi.fn(async (userId: string) => ({
    ok: true,
    subjectUserId: userId,
    actorUserId: userId,
    actorName: 'Test User',
  })),
}));

vi.mock('@/lib/ai/postProcess', () => ({
  cleanLongFormPlainText: (s: string) => s,
}));

vi.mock('@/lib/ai/prefillFromMemberState', () => ({
  prefillCoverLetter: vi.fn(),
  honestNoResumeError: () => ({
    error: 'We need a resume to tailor this for you. Upload one at /dashboard/resume, then come back.',
    status: 400,
  }),
}));

vi.mock('@/lib/ai/aiCoachContext', () => ({
  getAICoachContext: vi.fn(async () => ({})),
  renderCoachContextForPrompt: vi.fn(() => ''),
}));

// ─── Imports after mocks ───
import { POST as coverLetterPost } from '@/app/api/ai/cover-letter/route';
import { getUser } from '@/lib/auth/server';
import { prefillCoverLetter } from '@/lib/ai/prefillFromMemberState';

const USER_ID = '550e8400-e29b-41d4-a716-446655440099';

const RESUME_TEXT =
  'Experienced software engineer with 5 years building Node and React apps. Led migrations, mentored juniors, shipped 0->1 products.';
const JOB_DESCRIPTION_TEXT =
  'Looking for a senior fullstack engineer to lead our payments platform refactor.';

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/cover-letter', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai/cover-letter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: USER_ID } as any);
  });

  it('succeeds when prefill is true and member has a resume on file', async () => {
    vi.mocked(prefillCoverLetter).mockResolvedValue({
      resume: RESUME_TEXT,
      jobTarget: 'Senior Engineer',
      companyName: null,
    });

    const res = await coverLetterPost(
      makePostRequest({
        prefill: true,
        jobDescription: JOB_DESCRIPTION_TEXT,
        companyName: 'ExampleCo',
      }) as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBeTruthy();
    expect(prefillCoverLetter).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects with a clear message when no resume is provided and prefill is false', async () => {
    const res = await coverLetterPost(
      makePostRequest({
        prefill: false,
        jobDescription: JOB_DESCRIPTION_TEXT,
        companyName: 'ExampleCo',
      }) as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe('string');
    expect(body.error).toMatch(/resume|prefill/i);
    expect(prefillCoverLetter).not.toHaveBeenCalled();
  });

  it('succeeds when resume is passed in directly (no prefill)', async () => {
    const res = await coverLetterPost(
      makePostRequest({
        resume: RESUME_TEXT,
        jobDescription: JOB_DESCRIPTION_TEXT,
        companyName: 'ExampleCo',
      }) as any
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBeTruthy();
    expect(prefillCoverLetter).not.toHaveBeenCalled();
  });

  it('returns honest no-resume error when prefill returns empty', async () => {
    vi.mocked(prefillCoverLetter).mockResolvedValue({
      resume: '',
      jobTarget: null,
      companyName: null,
    });

    const res = await coverLetterPost(
      makePostRequest({
        prefill: true,
        jobDescription: JOB_DESCRIPTION_TEXT,
        companyName: 'ExampleCo',
      }) as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/resume/i);
  });
});
