import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    aIJobMatch: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    job: {
      findFirst: vi.fn().mockResolvedValue({ title: 'IT Support Specialist' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findMany: vi.fn().mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.map((id) => ({ id }))),
      ),
    },
  },
}));

vi.mock('@/lib/admin/aiJobMatchCompute', () => ({
  getOrComputeAiJobMatches: vi.fn(),
  markAiJobMatchEmptyCooldown: vi.fn(),
  clearAiJobMatchEmptyCooldown: vi.fn(),
}));

vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

// ─── Imports after mocks ───
import { createAdminJobMatchesPrismaDeps } from '@/lib/admin/adminJobMatchesPrismaDeps';
import { createNotification } from '@/lib/notifications/create';

describe('Trigger: job_match', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@/lib/db/prisma');
    vi.mocked(prisma.user.findMany).mockImplementation(({ where }: any) =>
      Promise.resolve(where.id.in.map((id: string) => ({ id }))) as any,
    );
  });

  it('creates job_match notification for each newly matched member', async () => {
    const deps = createAdminJobMatchesPrismaDeps('org-1', async () => {});
    await deps.persistMatches('job-123', [
      { studentId: 'user-1', matchScore: 85, matchReasons: ['Skill match'] },
      { studentId: 'user-2', matchScore: 72, matchReasons: ['Certification match'] },
    ]);

    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'job_match',
        title: 'New job match',
        body: 'We found a match: IT Support Specialist',
        data: expect.objectContaining({ jobId: 'job-123', matchScore: 85 }),
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: 'job_match',
        title: 'New job match',
        body: 'We found a match: IT Support Specialist',
        data: expect.objectContaining({ jobId: 'job-123', matchScore: 72 }),
      })
    );
    const { prisma } = await import('@/lib/db/prisma');
    expect(prisma.aIJobMatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        jobId: 'job-123',
        job: { organizationId: 'org-1' },
        student: { organizationId: 'org-1' },
      },
    }));
  });

  it('does not create notifications when there are no new matches', async () => {
    const deps = createAdminJobMatchesPrismaDeps('org-1', async () => {});
    await deps.persistMatches('job-123', []);

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('drops candidate ids that are not proven inside the job tenant', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    const deps = createAdminJobMatchesPrismaDeps('org-1', async () => {});

    await deps.persistMatches('job-123', [
      { studentId: 'foreign-user', matchScore: 99, matchReasons: ['Synthetic boundary fixture'] },
    ]);

    expect(prisma.aIJobMatch.createMany).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('does not duplicate notifications for existing matches', async () => {
    const { prisma } = await import('@/lib/db/prisma');
    vi.mocked(prisma.aIJobMatch.findMany).mockResolvedValue([
      { studentId: 'user-1' },
    ] as any);

    const deps = createAdminJobMatchesPrismaDeps('org-1', async () => {});
    await deps.persistMatches('job-123', [
      { studentId: 'user-1', matchScore: 85, matchReasons: ['Skill match'] },
      { studentId: 'user-2', matchScore: 72, matchReasons: ['Certification match'] },
    ]);

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: 'job_match',
      })
    );
  });
});
