import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }));
vi.mock('@/lib/content/programs', () => ({ getProgramBySlug: vi.fn() }));

const { matchStudentsForJob } = await import('@/lib/ai/matchStudents');
const { prisma } = await import('@/lib/db/prisma');

describe('matchStudentsForJob tenant boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
  });

  it('filters candidates before selecting scoring data and does not select names', async () => {
    await matchStudentsForJob('org-a', {
      requirements: [], suggestedPrograms: [], preferredCertifications: [],
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-a' }),
      select: expect.not.objectContaining({ fullName: expect.anything() }),
    }));
  });
});
