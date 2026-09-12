import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    job: { findFirst: vi.fn(), updateMany: vi.fn() },
    aIJobMatch: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock('@/lib/admin/aiJobMatchCompute', () => ({
  getOrComputeAiJobMatches: vi.fn(),
  markAiJobMatchEmptyCooldown: vi.fn(),
  clearAiJobMatchEmptyCooldown: vi.fn(),
}));
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn() }));

const { createAdminJobMatchesPrismaDeps } = await import('@/lib/admin/adminJobMatchesPrismaDeps');
const { prisma } = await import('@/lib/db/prisma');
const { getOrComputeAiJobMatches } = await import('@/lib/admin/aiJobMatchCompute');

const job = {
  id: 'job-a', title: 'Role', requirements: [], suggestedPrograms: [], preferredCertifications: [],
};

describe('admin job-match Prisma tenant scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.job.findFirst).mockResolvedValue(job as never);
    vi.mocked(prisma.aIJobMatch.findMany).mockResolvedValue([] as never);
    vi.mocked(getOrComputeAiJobMatches).mockResolvedValue([]);
  });

  it('scopes authorization and cached PII by both job and student tenant', async () => {
    const deps = createAdminJobMatchesPrismaDeps('org-a', async () => {});
    await deps.findAuthorizedJob('job-a');
    await deps.findCachedRows('job-a');

    expect(prisma.job.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job-a', organizationId: 'org-a' },
    }));
    expect(prisma.aIJobMatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        jobId: 'job-a',
        job: { organizationId: 'org-a' },
        student: { organizationId: 'org-a' },
      },
    }));
  });

  it('threads the proved tenant into uncached computation', async () => {
    const deps = createAdminJobMatchesPrismaDeps('org-a', async () => {});
    await deps.computeMatches('job-a', job);
    expect(getOrComputeAiJobMatches).toHaveBeenCalledWith('job-a', 'org-a', job);
  });
});
