import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enrollmentFindMany: vi.fn(),
  rollupFindMany: vi.fn(),
  progressGroupBy: vi.fn(),
  userFindMany: vi.fn(),
  userUpdateMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    courseEnrollment: { findMany: mocks.enrollmentFindMany },
    memberProgramProgress: { findMany: mocks.rollupFindMany },
    courseProgress: { groupBy: mocks.progressGroupBy },
    user: {
      findMany: mocks.userFindMany,
      updateMany: mocks.userUpdateMany,
    },
  },
}));

import { getValidatedProgramCompletionSpec } from '@/lib/reporting/programCompletion';
import { runStaleCourseraTrainingCheck } from '@/lib/member/staleTrainingCron';

const USER_ID = 'member-1';
const CANONICAL_PROGRAM = 'comptia-a-professional-certificate';
const LEGACY_PROGRAM = 'comptia-a-plus';
const completionSpec = getValidatedProgramCompletionSpec(CANONICAL_PROGRAM);

if (!completionSpec) throw new Error('Expected CompTIA A+ validated completion spec');

describe('runStaleCourseraTrainingCheck completion truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrollmentFindMany.mockResolvedValue([
      { userId: USER_ID, programSlug: CANONICAL_PROGRAM },
    ]);
    mocks.progressGroupBy.mockResolvedValue([]);
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('finds an exact X=Y completion stored under a historical alias', async () => {
    mocks.rollupFindMany.mockResolvedValue([
      {
        userId: USER_ID,
        programSlug: LEGACY_PROGRAM,
        coursesCompleted: completionSpec.totalCourses,
      },
    ]);
    mocks.userFindMany.mockResolvedValue([
      { id: USER_ID, staleTrainingDetectedAt: new Date('2026-08-01T00:00:00.000Z') },
    ]);

    const result = await runStaleCourseraTrainingCheck();

    expect(result).toMatchObject({ cleared: 1, newlyFlagged: 0, reStamped: 0 });
    expect(mocks.rollupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            {
              userId: USER_ID,
              programSlug: {
                in: expect.arrayContaining([CANONICAL_PROGRAM, LEGACY_PROGRAM]),
              },
            },
          ]),
        },
      }),
    );
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { staleTrainingDetectedAt: null } }),
    );
  });

  it('does not treat averagePercent=100 as complete when X is less than Y', async () => {
    mocks.rollupFindMany.mockResolvedValue([
      {
        userId: USER_ID,
        programSlug: CANONICAL_PROGRAM,
        coursesCompleted: completionSpec.totalCourses - 1,
        averagePercent: 100,
      },
    ]);
    mocks.userFindMany.mockResolvedValue([
      { id: USER_ID, staleTrainingDetectedAt: null },
    ]);

    const result = await runStaleCourseraTrainingCheck();

    expect(result).toMatchObject({ newlyFlagged: 1, cleared: 0, reStamped: 0 });
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { staleTrainingDetectedAt: expect.any(Date) },
      }),
    );
  });
});
