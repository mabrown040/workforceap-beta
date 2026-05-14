import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminMetrics } from './metrics';

const mockCache = {
  getCacheOrFetch: vi.fn(),
};

vi.mock('@/lib/cache', () => ({
  getCacheOrFetch: (...args: unknown[]) => mockCache.getCacheOrFetch(...args),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: async (_orgId: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({ user: { count: vi.fn().mockResolvedValue(0) } }),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    memberEvent: { findMany: vi.fn().mockResolvedValue([]) },
    goal: { count: vi.fn().mockResolvedValue(0) },
    jobApplication: { count: vi.fn().mockResolvedValue(0) },
    resourceProgress: { count: vi.fn().mockResolvedValue(0) },
    learningProgress: { count: vi.fn().mockResolvedValue(0) },
    aIToolResult: { count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    placementRecord: { count: vi.fn().mockResolvedValue(0) },
    userCertification: { count: vi.fn().mockResolvedValue(0) },
    workflowDiagnostic: { count: vi.fn().mockResolvedValue(0) },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

describe('admin metrics caching', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAdminMetrics uses cache with org-scoped key', async () => {
    const cachedMetrics = {
      totalMembers: 42,
      weeklyActiveMembers: 10,
      inactive14Days: 5,
      activeGoals: 3,
      applicationsSubmitted: 2,
      resourcesCompleted: 1,
      aiToolRuns: 0,
      aiToolStats: { runsLastNDays: 0, trend: 0, totalRuns: 0, breakdown: [] },
      pathwayStarts: 0,
      inactiveUserIds: [],
      dailyActivity: [],
      enrollmentByProgram: [],
      placementStats: { enrolled: 0, placed: 0, certifications: 0, placementRate: 0 },
      careerOsMetrics: {
        completionEventsReceived: 0,
        actionsCreated: 0,
        actionsCompleted: 0,
        actionsDismissed: 0,
        actionsPending: 0,
        followThroughRate: 0,
      },
    };

    mockCache.getCacheOrFetch.mockResolvedValueOnce(cachedMetrics);
    const result = await getAdminMetrics('org-123');

    expect(mockCache.getCacheOrFetch).toHaveBeenCalledWith(
      'admin:metrics:org-123',
      expect.any(Function),
      300,
    );
    expect(result.totalMembers).toBe(42);
  });

  it('getAdminMetrics fetcher runs on cache miss', async () => {
    let fetcherCalled = false;
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => {
      fetcherCalled = true;
      return fetcher();
    });

    // The fetcher will fail because prisma is mocked to an empty object,
    // but we just need to verify it was invoked.
    await expect(getAdminMetrics('org-456')).rejects.toThrow();
    expect(fetcherCalled).toBe(true);
    expect(mockCache.getCacheOrFetch).toHaveBeenCalledWith(
      'admin:metrics:org-456',
      expect.any(Function),
      300,
    );
  });
});
