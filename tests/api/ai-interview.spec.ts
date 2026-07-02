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

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    user: {
      findUnique: vi.fn(),
    },
    // Models touched by getMemberState/getMemberResumePlainText, which run in
    // the background of these routes — harmless defaults to avoid unhandled
    // rejections.
    profile: { findUnique: vi.fn(async () => null) },
    aIToolResult: { findFirst: vi.fn(async () => null) },
    counselorAssignment: { findFirst: vi.fn(async () => null) },
    courseEnrollment: { findFirst: vi.fn(async () => null) },
    memberEvent: { findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    message: { count: vi.fn(async () => 0) },
    messageThread: { findFirst: vi.fn(async () => null) },
    partnerReferral: { findFirst: vi.fn(async () => null) },
    placementRecord: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(),
}));

vi.mock('@/lib/ai/groq', () => ({
  chatCompletion: vi.fn(),
  isAIConfigured: vi.fn(() => true),
}));

// ─── Imports after mocks ───
import { POST as startInterview } from '@/app/api/ai/interview/start/route';
import { POST as interviewResponse } from '@/app/api/ai/interview/response/route';
import { GET as interviewResults } from '@/app/api/ai/interview/results/route';
import { interviewSessions } from '@/app/api/ai/interview/_sessionStore';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  userNoProfile: '550e8400-e29b-41d4-a716-446655440002',
  session: '550e8400-e29b-41d4-a716-446655440003',
};

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string) {
  return new Request(url, { method: 'GET' });
}

describe('AI Interview Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    interviewSessions.clear();
    vi.mocked(checkAIToolRateLimit).mockResolvedValue({ success: true } as any);
    vi.mocked(isAIConfigured).mockReturnValue(true);
  });

  // ═══════════════════════════════════════════
  // POST /api/ai/interview/start
  // ═══════════════════════════════════════════
  describe('POST /api/ai/interview/start', () => {
    it('returns 401 for unauthenticated user', async () => {
      vi.mocked(getUser).mockResolvedValue(null as any);

      const res = await startInterview(
        makePostRequest('http://localhost/api/ai/interview/start', { role: 'Developer' })
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 for missing member profile', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.userNoProfile } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await startInterview(
        makePostRequest('http://localhost/api/ai/interview/start', { role: 'Developer' })
      );

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Member profile not found' });
    });

    it('starts interview session for authenticated member', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: UUIDS.user,
        fullName: 'Test Member',
        enrolledProgram: 'it-cyber',
      } as any);

      vi.mocked(chatCompletion).mockResolvedValue(
        JSON.stringify({
          opening: "Let's practice your interview skills!",
          question: 'Tell me about a time you faced a difficult challenge at work.',
          type: 'behavioral',
          category: 'problem_solving',
        })
      );

      const res = await startInterview(
        makePostRequest('http://localhost/api/ai/interview/start', {
          role: 'Software Engineer',
          experienceLevel: 'mid',
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.sessionId).toBeDefined();
      expect(body.opening).toBe("Let's practice your interview skills!");
      expect(body.question).toContain('Tell me about a time');
      expect(body.type).toBe('behavioral');
      expect(body.category).toBe('problem_solving');

      // Session should be stored
      expect(interviewSessions.has(body.sessionId)).toBe(true);
      const session = interviewSessions.get(body.sessionId)!;
      expect(session.userId).toBe(UUIDS.user);
      expect(session.questions).toHaveLength(1);
      expect(session.responses).toHaveLength(0);
    });

    it('handles malformed AI response gracefully', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: UUIDS.user,
        fullName: 'Test Member',
      } as any);

      vi.mocked(chatCompletion).mockResolvedValue('This is not JSON');

      const res = await startInterview(
        makePostRequest('http://localhost/api/ai/interview/start', {})
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sessionId).toBeDefined();
      expect(body.question).toBe('This is not JSON');
    });

    it('returns 503 when AI is not configured', async () => {
      vi.mocked(isAIConfigured).mockReturnValue(false);

      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      const res = await startInterview(
        makePostRequest('http://localhost/api/ai/interview/start', {})
      );

      expect(res.status).toBe(503);
    });
  });

  // ═══════════════════════════════════════════
  // POST /api/ai/interview/response
  // ═══════════════════════════════════════════
  describe('POST /api/ai/interview/response', () => {
    beforeEach(() => {
      // Seed a session for response tests
      interviewSessions.set(UUIDS.session, {
        userId: UUIDS.user,
        questions: [{ question: 'Tell me about yourself.', type: 'behavioral' }],
        responses: [],
        startedAt: new Date(),
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      vi.mocked(getUser).mockResolvedValue(null as any);

      const res = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', {
          sessionId: UUIDS.session,
          answer: 'I am a hard worker.',
        })
      );

      expect(res.status).toBe(401);
    });

    it('processes member response and generates follow-up question', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(chatCompletion).mockResolvedValue(
        JSON.stringify({
          question: 'Describe a time you worked on a team project.',
          type: 'behavioral',
          category: 'teamwork',
        })
      );

      const res = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', {
          sessionId: UUIDS.session,
          answer: 'I have five years of experience in software development.',
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.complete).toBe(false);
      expect(body.question).toContain('team');
      expect(body.category).toBe('teamwork');
      expect(body.questionsAnswered).toBe(1);

      const session = interviewSessions.get(UUIDS.session)!;
      expect(session.responses).toHaveLength(1);
      expect(session.responses[0].answer).toContain('five years');
      expect(session.questions).toHaveLength(2);
    });

    it('handles end-of-interview after max questions', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      // Fill session to near completion (5 questions max)
      const session = interviewSessions.get(UUIDS.session)!;
      session.questions = [
        { question: 'Q1', type: 'behavioral' },
        { question: 'Q2', type: 'behavioral' },
        { question: 'Q3', type: 'behavioral' },
        { question: 'Q4', type: 'behavioral' },
        { question: 'Q5', type: 'behavioral' },
      ];
      session.responses = [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
        { question: 'Q3', answer: 'A3' },
        { question: 'Q4', answer: 'A4' },
      ];

      const res = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', {
          sessionId: UUIDS.session,
          answer: 'A5',
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.complete).toBe(true);
      expect(body.message).toContain('completed');
      expect(body.questionsAnswered).toBe(5);

      expect(session.completedAt).toBeDefined();
    });

    it('returns 404 for unknown session', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      const res = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', {
          sessionId: 'unknown-session',
          answer: 'test',
        })
      );

      expect(res.status).toBe(404);
    });

    it('returns 400 for missing sessionId or answer', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      const resNoSession = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', { answer: 'test' })
      );
      expect(resNoSession.status).toBe(400);

      const resNoAnswer = await interviewResponse(
        makePostRequest('http://localhost/api/ai/interview/response', { sessionId: UUIDS.session })
      );
      expect(resNoAnswer.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // GET /api/ai/interview/results
  // ═══════════════════════════════════════════
  describe('GET /api/ai/interview/results', () => {
    beforeEach(() => {
      interviewSessions.set(UUIDS.session, {
        userId: UUIDS.user,
        questions: [
          { question: 'Tell me about yourself.', type: 'behavioral' },
          { question: 'Describe a challenge.', type: 'behavioral' },
        ],
        responses: [
          { question: 'Tell me about yourself.', answer: 'I am experienced.' },
          { question: 'Describe a challenge.', answer: 'I solved a hard bug.' },
        ],
        startedAt: new Date(),
        completedAt: new Date(),
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      vi.mocked(getUser).mockResolvedValue(null as any);

      const res = await interviewResults(
        makeGetRequest(`http://localhost/api/ai/interview/results?sessionId=${UUIDS.session}`)
      );

      expect(res.status).toBe(401);
    });

    it('returns interview summary with scored categories', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(chatCompletion).mockResolvedValue(
        JSON.stringify({
          overallScore: 82,
          categories: [
            { name: 'communication', score: 85, feedback: 'Clear and concise responses.' },
            { name: 'leadership', score: 70, feedback: 'Add more examples of leading teams.' },
            { name: 'problem_solving', score: 90, feedback: 'Excellent structured approach.' },
            { name: 'teamwork', score: 80, feedback: 'Good collaboration stories.' },
            { name: 'adaptability', score: 85, feedback: 'Strong examples of handling change.' },
          ],
          strengths: ['Clear communication', 'Strong problem-solving'],
          improvements: ['Use more STAR method detail', 'Quantify achievements'],
          summary: 'You demonstrated solid interview skills with room to grow.',
        })
      );

      const res = await interviewResults(
        makeGetRequest(`http://localhost/api/ai/interview/results?sessionId=${UUIDS.session}`)
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.sessionId).toBe(UUIDS.session);
      expect(body.overallScore).toBe(82);
      expect(body.summary).toContain('solid interview skills');
      expect(body.categories).toHaveLength(5);
      expect(body.categories[0]).toMatchObject({
        name: 'communication',
        score: 85,
        feedback: 'Clear and concise responses.',
      });
      expect(body.strengths).toContain('Clear communication');
      expect(body.improvements).toContain('Use more STAR method detail');
      expect(body.questionsAnswered).toBe(2);
      expect(body.completedAt).toBeDefined();
    });

    it('includes improvement tips in results', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(chatCompletion).mockResolvedValue(
        JSON.stringify({
          overallScore: 65,
          categories: [
            { name: 'communication', score: 60, feedback: 'Work on clarity.' },
            { name: 'leadership', score: 55, feedback: 'Need more leadership examples.' },
            { name: 'problem_solving', score: 70, feedback: 'Good start, add more detail.' },
            { name: 'teamwork', score: 65, feedback: 'Expand on team contributions.' },
            { name: 'adaptability', score: 75, feedback: 'Strong adaptability shown.' },
          ],
          strengths: ['You completed all questions'],
          improvements: [
            'Practice using the STAR method',
            'Give specific numbers and outcomes',
            'Keep answers under 2 minutes',
            'Prepare 5-10 stories before interviews',
          ],
          summary: 'Good effort — focused practice will raise your scores quickly.',
        })
      );

      const res = await interviewResults(
        makeGetRequest(`http://localhost/api/ai/interview/results?sessionId=${UUIDS.session}`)
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.improvements).toHaveLength(4);
      expect(body.improvements[0]).toContain('STAR method');
      expect(body.improvements[1]).toContain('numbers');
    });

    it('returns fallback results when AI is unavailable', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
      vi.mocked(chatCompletion).mockResolvedValue(null);

      const res = await interviewResults(
        makeGetRequest(`http://localhost/api/ai/interview/results?sessionId=${UUIDS.session}`)
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.overallScore).toBe(70);
      expect(body.categories).toHaveLength(5);
      expect(body.improvements).toContain('Use the STAR method for behavioral questions.');
    });

    it('returns 404 for unknown session', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      const res = await interviewResults(
        makeGetRequest('http://localhost/api/ai/interview/results?sessionId=unknown')
      );

      expect(res.status).toBe(404);
    });

    it('returns 400 when sessionId is missing', async () => {
      vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

      const res = await interviewResults(
        makeGetRequest('http://localhost/api/ai/interview/results')
      );

      expect(res.status).toBe(400);
    });
  });
});
