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
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/ensureUser', () => ({
  ensureUserInDb: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/events/track', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as goalsGET, POST as goalsPOST } from '@/app/api/member/goals/route';
import { PATCH as goalPATCH, DELETE as goalDELETE } from '@/app/api/member/goals/[id]/route';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { trackEvent } from '@/lib/events/track';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  goal1: '550e8400-e29b-41d4-a716-446655440002',
  goal2: '550e8400-e29b-41d4-a716-446655440003',
};

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: UUIDS.goal1,
    userId: UUIDS.user,
    goalType: 'JOB_SEARCH',
    title: 'Get a software engineer job',
    description: 'Apply to 10 jobs per week',
    targetMetricType: 'applications',
    targetMetricValue: 10,
    targetDate: new Date('2025-12-31'),
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    completedAt: null,
    ...overrides,
  };
}

const makeRequest = (body?: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/member/goals', {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

// ─────────────────────────────────────────────
// GET /api/member/goals
// ─────────────────────────────────────────────
describe('GET /api/member/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns goals for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(ensureUserInDb).mockResolvedValue(undefined);
    vi.mocked(prisma.goal.findMany).mockResolvedValue([
      makeGoal({ id: UUIDS.goal1, title: 'Goal A' }),
      makeGoal({ id: UUIDS.goal2, title: 'Goal B', status: 'COMPLETED', completedAt: new Date() }),
    ]);

    const res = await goalsGET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goals).toHaveLength(2);
    expect(body.goals[0].title).toBe('Goal A');
    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: UUIDS.user },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    );
  });

  it('returns empty array when no goals exist', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(ensureUserInDb).mockResolvedValue(undefined);
    vi.mocked(prisma.goal.findMany).mockResolvedValue([]);

    const res = await goalsGET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goals).toEqual([]);
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await goalsGET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findMany).mockRejectedValue(new Error('DB error'));

    const res = await goalsGET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load goals' });
  });
});

// ─────────────────────────────────────────────
// POST /api/member/goals
// ─────────────────────────────────────────────
describe('POST /api/member/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new goal for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(ensureUserInDb).mockResolvedValue(undefined);
    vi.mocked(prisma.goal.count).mockResolvedValue(0);
    vi.mocked(prisma.goal.create).mockResolvedValue(makeGoal());

    const res = await goalsPOST(makeRequest({
      goalType: 'JOB_SEARCH',
      title: 'Get a software engineer job',
      description: 'Apply to 10 jobs per week',
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goal.title).toBe('Get a software engineer job');
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: UUIDS.user, eventName: 'goal_created', entityType: 'goal' })
    );
  });

  it('returns 400 when member has 3 active goals', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.count).mockResolvedValue(3);

    const res = await goalsPOST(makeRequest({
      goalType: 'JOB_SEARCH',
      title: 'Another goal',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'You can have at most 3 active goals' });
    expect(prisma.goal.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

    const req = new Request('http://localhost:3000/api/member/goals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await goalsPOST(req);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('returns 400 for missing required fields', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);

    const res = await goalsPOST(makeRequest({ description: 'Missing title and type' }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await goalsPOST(makeRequest({ goalType: 'JOB_SEARCH', title: 'Goal' }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.count).mockResolvedValue(0);
    vi.mocked(prisma.goal.create).mockRejectedValue(new Error('DB error'));

    const res = await goalsPOST(makeRequest({ goalType: 'JOB_SEARCH', title: 'Goal' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create goal' });
  });
});

// ─────────────────────────────────────────────
// PATCH /api/member/goals/[id]
// ─────────────────────────────────────────────
describe('PATCH /api/member/goals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a goal for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(makeGoal());
    vi.mocked(prisma.goal.update).mockResolvedValue(makeGoal({ title: 'Updated title' }));

    const req = new Request('http://localhost:3000/api/member/goals/goal-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    });

    const res = await goalPATCH(req, { params: Promise.resolve({ id: UUIDS.goal1 }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goal.title).toBe('Updated title');
  });

  it('marks goal as completed and sets completedAt', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(makeGoal());
    vi.mocked(prisma.goal.update).mockResolvedValue(makeGoal({ status: 'COMPLETED', completedAt: new Date() }));

    const req = new Request('http://localhost:3000/api/member/goals/goal-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });

    const res = await goalPATCH(req, { params: Promise.resolve({ id: UUIDS.goal1 }) });

    expect(res.status).toBe(200);
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: UUIDS.user, eventName: 'goal_completed' })
    );
    expect(prisma.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: UUIDS.goal1 },
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      })
    );
  });

  it('returns 404 for non-existent goal', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/member/goals/missing-id', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });

    const res = await goalPATCH(req, { params: Promise.resolve({ id: 'missing-id' }) });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const req = new Request('http://localhost:3000/api/member/goals/goal-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });

    const res = await goalPATCH(req, { params: Promise.resolve({ id: UUIDS.goal1 }) });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 for invalid JSON', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(makeGoal());

    const req = new Request('http://localhost:3000/api/member/goals/goal-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await goalPATCH(req, { params: Promise.resolve({ id: UUIDS.goal1 }) });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });
});

// ─────────────────────────────────────────────
// DELETE /api/member/goals/[id]
// ─────────────────────────────────────────────
describe('DELETE /api/member/goals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a goal for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(makeGoal());
    vi.mocked(prisma.goal.delete).mockResolvedValue(makeGoal());

    const res = await goalDELETE(
      new Request('http://localhost:3000/api/member/goals/goal-123'),
      { params: Promise.resolve({ id: UUIDS.goal1 }) }
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(prisma.goal.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: UUIDS.goal1 } })
    );
  });

  it('returns 404 for non-existent goal', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null);

    const res = await goalDELETE(
      new Request('http://localhost:3000/api/member/goals/missing-id'),
      { params: Promise.resolve({ id: 'missing-id' }) }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
    expect(prisma.goal.delete).not.toHaveBeenCalled();
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await goalDELETE(
      new Request('http://localhost:3000/api/member/goals/goal-123'),
      { params: Promise.resolve({ id: UUIDS.goal1 }) }
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
