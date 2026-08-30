import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: Request,
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
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: unknown) => handler,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => {
      const { prisma } = await import('@/lib/db/prisma');
      return typeof arg === 'function' ? arg(prisma) : Promise.all(arg);
    }),
    user: { findUnique: vi.fn() },
    courseProgress: { findFirst: vi.fn() },
    memberEvent: { count: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/ai/skillMissionEval', () => ({
  MissionEvalUnavailableError: class MissionEvalUnavailableError extends Error {},
  evaluateSkillMission: vi.fn(),
}));

import { POST as evaluateMission } from '@/app/api/skill-missions/[courseSlug]/evaluate/route';
import { POST as checkQuiz } from '@/app/api/skill-missions/[courseSlug]/quiz-check/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { evaluateSkillMission } from '@/lib/ai/skillMissionEval';

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROGRAM = 'data-analytics-professional-certificate-google';
const VERSION = '2026-approved-v2';

function missionRequest(missionKey: string): Request {
  return new Request('http://localhost/api/skill-missions/data-analytics-course-1/evaluate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      missionKey,
      quizAnswers: [
        { questionIndex: 0, selectedIndex: 0 },
        { questionIndex: 1, selectedIndex: 0 },
        { questionIndex: 2, selectedIndex: 0 },
      ],
      scenarioResponse: 'A sufficiently detailed mission response for the evaluator.',
    }),
  });
}

function assignment(curriculumVersion = VERSION) {
  return {
    enrolledProgram: PROGRAM,
    courseEnrollments: [{
      programSlug: PROGRAM,
      curriculumVersion,
      isPrimary: true,
    }],
  };
}

describe('Skill Mission curriculum-version mutation gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: USER_ID, email: 'member@example.test' } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(assignment() as any);
    vi.mocked(prisma.memberEvent.count).mockResolvedValue(0);
    vi.mocked(prisma.memberEvent.create).mockResolvedValue({} as any);
    vi.mocked(evaluateSkillMission).mockResolvedValue({
      verdict: 'passed',
      coachingNote: 'Clear evidence.',
      starStory: 'A concise STAR story.',
      resumeBullet: 'Delivered a measurable result.',
      skillsUnlocked: ['Analysis'],
      quizCorrectCount: 3,
      aiToolResultId: 'ai-result-1',
    } as any);
  });

  it('rejects a legacy-only mission for a v2 learner before progress or event writes', async () => {
    const courseSlug = 'data-analytics-course-8';
    const missionKey = `${PROGRAM}:curriculum:${VERSION}:mission:${courseSlug}`;

    const res = await evaluateMission(missionRequest(missionKey) as any, {
      params: Promise.resolve({ courseSlug }),
    });

    expect(res.status).toBe(404);
    expect(prisma.courseProgress.findFirst).not.toHaveBeenCalled();
    expect(prisma.memberEvent.count).not.toHaveBeenCalled();
    expect(prisma.memberEvent.create).not.toHaveBeenCalled();
    expect(evaluateSkillMission).not.toHaveBeenCalled();
  });

  it('accepts an assigned v2 mission using canonical completion and version-scoped events', async () => {
    const courseSlug = 'data-analytics-course-1';
    const missionKey = `${PROGRAM}:curriculum:${VERSION}:mission:${courseSlug}`;
    vi.mocked(prisma.courseProgress.findFirst).mockResolvedValue({ id: 'progress-1' } as any);

    const res = await evaluateMission(missionRequest(missionKey) as any, {
      params: Promise.resolve({ courseSlug }),
    });

    expect(res.status).toBe(200);
    expect(prisma.courseProgress.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER_ID,
          programSlug: PROGRAM,
          courseSlug: { in: expect.arrayContaining(['foundations-data']) },
          status: 'COMPLETED',
        }),
      }),
    );
    expect(evaluateSkillMission).toHaveBeenCalledWith(
      expect.objectContaining({
        courseSlug: 'foundations-data',
        programSlug: PROGRAM,
        missionKey,
      }),
    );
    expect(prisma.memberEvent.create).toHaveBeenCalledTimes(2);
    for (const [call] of vi.mocked(prisma.memberEvent.create).mock.calls) {
      expect(call.data).toEqual(expect.objectContaining({ entityId: missionKey }));
      expect(call.data.metadata).toEqual(expect.objectContaining({
        curriculumVersion: VERSION,
        assignedCourseSlug: 'foundations-data',
      }));
    }
  });

  it('rejects an unknown pinned version before mission writes', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(assignment('future-unapproved-v3') as any);
    const courseSlug = 'data-analytics-course-1';

    const res = await evaluateMission(missionRequest(
      `${PROGRAM}:curriculum:future-unapproved-v3:mission:${courseSlug}`,
    ) as any, { params: Promise.resolve({ courseSlug }) });

    expect(res.status).toBe(404);
    expect(prisma.courseProgress.findFirst).not.toHaveBeenCalled();
    expect(prisma.memberEvent.create).not.toHaveBeenCalled();
  });

  it('does not disclose quiz answers for a removed v2 mission', async () => {
    const courseSlug = 'data-analytics-course-8';
    const missionKey = `${PROGRAM}:curriculum:${VERSION}:mission:${courseSlug}`;
    const request = new Request('http://localhost/api/skill-missions/quiz-check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionKey, questionIndex: 0, selectedIndex: 0 }),
    });

    const res = await checkQuiz(request as any, {
      params: Promise.resolve({ courseSlug }),
    });

    expect(res.status).toBe(404);
    expect(prisma.courseProgress.findFirst).not.toHaveBeenCalled();
  });
});
