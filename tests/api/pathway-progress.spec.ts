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
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/ensureUser', () => ({
  ensureUserInDb: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pathwayStepProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    learningProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    memberEvent: {
      create: vi.fn(),
    },
    pointsTransaction: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/events/track', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/member/points', () => ({
  awardPoints: vi.fn().mockResolvedValue({ awarded: true, points: 10, total: 100, level: 'starter' }),
}));

vi.mock('@/lib/content/learningPathways', () => ({
  findPathwayById: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as getProgress } from '@/app/api/member/pathway-steps/progress/route';
import { POST as completeStep } from '@/app/api/member/pathway-steps/[pathwayId]/[stepIndex]/complete/route';
import { GET as getLearningProgress } from '@/app/api/member/learning-progress/route';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { findPathwayById } from '@/lib/content/learningPathways';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { trackEvent } from '@/lib/events/track';
import { awardPoints } from '@/lib/member/points';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  progress1: '550e8400-e29b-41d4-a716-446655440002',
  progress2: '550e8400-e29b-41d4-a716-446655440003',
};

function mockAuthUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return { id: UUIDS.user, email: 'test@example.com', ...overrides };
}

// ─────────────────────────────────────────────
// GET /api/member/pathway-steps/progress
// ─────────────────────────────────────────────
describe('GET /api/member/pathway-steps/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await getProgress(new Request('http://localhost'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns current pathway progress for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);

    const mockProgress = [
      {
        id: UUIDS.progress1,
        userId: UUIDS.user,
        pathwayId: 'it-support',
        stepIndex: 0,
        stepTitle: 'Digital Literacy',
        status: 'completed',
        completedAt: new Date('2025-01-01'),
        notes: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        id: UUIDS.progress2,
        userId: UUIDS.user,
        pathwayId: 'it-support',
        stepIndex: 1,
        stepTitle: 'CompTIA A+',
        status: 'in_progress',
        completedAt: null,
        notes: null,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
      },
    ];

    vi.mocked(prisma.pathwayStepProgress.findMany).mockResolvedValue(mockProgress as any);

    const res = await getProgress(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBeDefined();
    expect(body.progress['it-support']).toHaveLength(2);
    expect(body.progress['it-support'][0].status).toBe('completed');
    expect(body.progress['it-support'][1].status).toBe('in_progress');

    expect(prisma.pathwayStepProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: UUIDS.user },
        take: 500,
      })
    );
  });

  it('returns empty object when member has no progress', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(prisma.pathwayStepProgress.findMany).mockResolvedValue([]);

    const res = await getProgress(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toEqual({});
  });

  it('groups progress by pathway id', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);

    const mockProgress = [
      {
        id: 'p1',
        userId: UUIDS.user,
        pathwayId: 'it-support',
        stepIndex: 0,
        stepTitle: 'Digital Literacy',
        status: 'completed',
        completedAt: new Date(),
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'p2',
        userId: UUIDS.user,
        pathwayId: 'data-analytics',
        stepIndex: 0,
        stepTitle: 'Excel/Sheets',
        status: 'in_progress',
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.pathwayStepProgress.findMany).mockResolvedValue(mockProgress as any);

    const res = await getProgress(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress['it-support']).toHaveLength(1);
    expect(body.progress['data-analytics']).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────
// POST /api/member/pathway-steps/[pathwayId]/[stepIndex]/complete
// ─────────────────────────────────────────────
describe('POST /api/member/pathway-steps/[pathwayId]/[stepIndex]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await completeStep(new Request('http://localhost:3000/api/member/pathway-steps/it-support/0/complete', {
      method: 'POST',
    }), { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '0' }) });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('marks step as complete and updates member progress', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue({
      id: 'it-support',
      title: 'IT Support Professional',
      description: 'Test',
      category: 'Technology',
      steps: ['Digital Literacy', 'CompTIA A+', 'IT Support Certificate', 'Job readiness'],
      estimatedWeeks: 16,
    });

    const mockProgress = {
      id: 'prog-1',
      userId: UUIDS.user,
      pathwayId: 'it-support',
      stepIndex: 0,
      stepTitle: 'Digital Literacy',
      status: 'completed',
      completedAt: new Date(),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.pathwayStepProgress.upsert).mockResolvedValue(mockProgress as any);
    vi.mocked(prisma.learningProgress.upsert).mockResolvedValue({
      id: 'lp-1',
      userId: UUIDS.user,
      pathwayId: 'it-support',
      progress: 25,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/0/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '0' }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress.status).toBe('completed');

    expect(prisma.pathwayStepProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_pathwayId_stepIndex: {
            userId: UUIDS.user,
            pathwayId: 'it-support',
            stepIndex: 0,
          },
        },
        create: expect.objectContaining({
          userId: UUIDS.user,
          pathwayId: 'it-support',
          stepIndex: 0,
          stepTitle: 'Digital Literacy',
          status: 'completed',
        }),
        update: expect.objectContaining({
          status: 'completed',
        }),
      })
    );
  });

  it('updates learning progress percentage based on step completion', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue({
      id: 'it-support',
      title: 'IT Support Professional',
      description: 'Test',
      category: 'Technology',
      steps: ['Digital Literacy', 'CompTIA A+', 'IT Support Certificate', 'Job readiness'],
      estimatedWeeks: 16,
    });

    vi.mocked(prisma.pathwayStepProgress.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.learningProgress.upsert).mockResolvedValue({
      id: 'lp-1',
      userId: UUIDS.user,
      pathwayId: 'it-support',
      progress: 50,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/1/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '1' }) }
    );

    expect(res.status).toBe(200);
    expect(prisma.learningProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          progress: 50,
          completed: false,
        }),
      })
    );
  });

  it('marks pathway as completed on final step', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue({
      id: 'it-support',
      title: 'IT Support Professional',
      description: 'Test',
      category: 'Technology',
      steps: ['Digital Literacy', 'CompTIA A+', 'IT Support Certificate', 'Job readiness'],
      estimatedWeeks: 16,
    });

    vi.mocked(prisma.pathwayStepProgress.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.learningProgress.upsert).mockResolvedValue({
      id: 'lp-1',
      userId: UUIDS.user,
      pathwayId: 'it-support',
      progress: 100,
      completed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/3/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '3' }) }
    );

    expect(res.status).toBe(200);
    expect(prisma.learningProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          progress: 100,
          completed: true,
        }),
      })
    );
  });

  it('tracks event and awards points on completion', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue({
      id: 'it-support',
      title: 'IT Support Professional',
      description: 'Test',
      category: 'Technology',
      steps: ['Digital Literacy', 'CompTIA A+', 'IT Support Certificate', 'Job readiness'],
      estimatedWeeks: 16,
    });

    vi.mocked(prisma.pathwayStepProgress.upsert).mockResolvedValue({
      id: 'prog-1',
      userId: UUIDS.user,
      pathwayId: 'it-support',
      stepIndex: 0,
      stepTitle: 'Digital Literacy',
      status: 'completed',
      completedAt: new Date(),
    } as any);
    vi.mocked(prisma.learningProgress.upsert).mockResolvedValue({} as any);

    await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/0/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '0' }) }
    );

    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: UUIDS.user,
        eventName: 'pathway_step_completed',
        entityType: 'pathway_step',
        entityId: 'it-support-0',
        metadata: expect.objectContaining({
          pathwayId: 'it-support',
          stepIndex: 0,
          stepTitle: 'Digital Literacy',
        }),
      })
    );

    expect(awardPoints).toHaveBeenCalledWith(
      UUIDS.user,
      'pathway_step_completed',
      'it-support-0'
    );
  });

  it('returns 400 for invalid step index', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/abc/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: 'abc' }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid step index');
  });

  it('returns 404 for non-existent pathway', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue(null);

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/nonexistent/0/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'nonexistent', stepIndex: '0' }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Pathway or step not found');
  });

  it('returns 404 for step index out of bounds', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(findPathwayById).mockReturnValue({
      id: 'it-support',
      title: 'IT Support Professional',
      description: 'Test',
      category: 'Technology',
      steps: ['Step 1', 'Step 2'],
      estimatedWeeks: 16,
    });

    const res = await completeStep(
      new Request('http://localhost:3000/api/member/pathway-steps/it-support/5/complete', {
        method: 'POST',
      }),
      { params: Promise.resolve({ pathwayId: 'it-support', stepIndex: '5' }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Pathway or step not found');
  });
});

// ─────────────────────────────────────────────
// GET /api/member/learning-progress
// ─────────────────────────────────────────────
describe('GET /api/member/learning-progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await getLearningProgress(new Request('http://localhost'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns learning progress for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);

    const mockProgress = [
      {
        id: 'lp-1',
        userId: UUIDS.user,
        pathwayId: 'it-support',
        progress: 75,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'lp-2',
        userId: UUIDS.user,
        pathwayId: 'data-analytics',
        progress: 100,
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.learningProgress.findMany).mockResolvedValue(mockProgress as any);

    const res = await getLearningProgress(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toHaveLength(2);
    expect(body.progress[0].pathwayId).toBe('it-support');
    expect(body.progress[0].progress).toBe(75);
    expect(body.progress[1].completed).toBe(true);

    expect(prisma.learningProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: UUIDS.user },
        take: 100,
      })
    );
  });

  it('returns empty array when no learning progress exists', async () => {
    vi.mocked(getUser).mockResolvedValue(mockAuthUser() as any);
    vi.mocked(prisma.learningProgress.findMany).mockResolvedValue([]);

    const res = await getLearningProgress(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toEqual([]);
  });
});
