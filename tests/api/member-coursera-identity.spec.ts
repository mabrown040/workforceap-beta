import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rateLimit: vi.fn(),
  queryRaw: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  mapIdentityAndProgress: vi.fn(),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/rate-limit', () => ({ checkCourseraIdentityRateLimit: mocks.rateLimit }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    user: { findUnique: mocks.findUnique, findMany: mocks.findMany },
  },
}));
vi.mock('@/lib/coursera/mapIdentityAndProgress.server', () => ({
  mapCourseraIdentityAndProgress: mocks.mapIdentityAndProgress,
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(async () => undefined),
}));

import { POST } from '@/app/api/member/coursera/identity/route';

function request(courseraEmail: string) {
  return new Request('http://localhost/api/member/coursera/identity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ courseraEmail }),
  });
}

describe('POST /api/member/coursera/identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.getUser.mockResolvedValue({ id: 'user-1' });
    mocks.queryRaw.mockResolvedValue([]);
    mocks.findUnique.mockResolvedValue({
      email: 'learner@example.com',
      fullName: 'Learner One',
      organizationId: 'org-1',
    });
    mocks.findMany.mockResolvedValue([]);
    mocks.mapIdentityAndProgress.mockResolvedValue({
      mapping: { courseraEmail: 'learner@example.com' },
      backfill: { courseRowsUpdated: 2, badgeRowsUpdated: 1 },
    });
  });

  it('atomically maps a matching member email and its raw progress', async () => {
    const response = await POST(request(' Learner@Example.com '));

    expect(response.status).toBe(200);
    expect(mocks.mapIdentityAndProgress).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
      courseraEmail: 'learner@example.com',
      createdByUserId: 'user-1',
      source: 'member_self_link',
      notes: 'Saved by member from Training page',
    });
  });

  it('fails closed when raw progress belongs to another member', async () => {
    mocks.mapIdentityAndProgress.mockRejectedValue(
      new Error('Coursera email already has progress linked to a different WAP user'),
    );

    const response = await POST(request('learner@example.com'));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This Coursera email is already linked to another account.',
    });
  });
});
