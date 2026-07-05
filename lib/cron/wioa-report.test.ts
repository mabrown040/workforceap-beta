import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/prisma', () => {
  const user = { count: vi.fn().mockResolvedValue(0) };
  const courseProgress = { groupBy: vi.fn().mockResolvedValue([]) };
  const placementRecord = {
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _avg: { salaryOffered: null } }),
    groupBy: vi.fn().mockResolvedValue([]),
  };
  const courseEnrollment = { groupBy: vi.fn().mockResolvedValue([]) };
  return { prisma: { user, courseProgress, placementRecord, courseEnrollment } };
});

import { prisma } from '@/lib/db/prisma';
import { generateWioaReport } from './wioa-report';

describe('generateWioaReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.courseProgress.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.placementRecord.count).mockResolvedValue(0);
    vi.mocked(prisma.placementRecord.aggregate).mockResolvedValue({ _avg: { salaryOffered: null } } as any);
    vi.mocked(prisma.placementRecord.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.courseEnrollment.groupBy).mockResolvedValue([]);
  });

  it('only counts staff-verified placements toward the monthly report', async () => {
    const period = { start: new Date('2026-06-01'), end: new Date('2026-06-30') };
    await generateWioaReport(period);

    expect(prisma.placementRecord.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ startDateVerified: true }) }),
    );
    expect(prisma.placementRecord.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ startDateVerified: true }) }),
    );
    for (const call of vi.mocked(prisma.placementRecord.groupBy).mock.calls) {
      expect(call[0]).toMatchObject({ where: expect.objectContaining({ startDateVerified: true }) });
    }
  });
});
