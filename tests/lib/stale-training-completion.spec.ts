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
import { LEGACY_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';
import { runStaleCourseraTrainingCheck } from '@/lib/member/staleTrainingCron';

const USER_ID = 'member-1';
const CANONICAL_PROGRAM = 'comptia-a-professional-certificate';
const LEGACY_PROGRAM = 'comptia-a-plus';
const SECOND_PROGRAM = 'digital-literacy-empowerment-class';
const completionSpec = getValidatedProgramCompletionSpec(
  CANONICAL_PROGRAM,
  LEGACY_CURRICULUM_VERSION,
);

if (!completionSpec) throw new Error('Expected CompTIA A+ validated completion spec');

describe('runStaleCourseraTrainingCheck completion truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enrollmentFindMany.mockResolvedValue([
      {
        id: 'enrollment-1',
        userId: USER_ID,
        programSlug: CANONICAL_PROGRAM,
        curriculumVersion: LEGACY_CURRICULUM_VERSION,
      },
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

  it.each(['complete', 'fresh'] as const)(
    'keeps a member stale when one program is stale and incomplete while another is %s',
    async (otherProgramState) => {
      mocks.enrollmentFindMany.mockResolvedValue([
        {
          id: 'enrollment-a',
          userId: USER_ID,
          programSlug: CANONICAL_PROGRAM,
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
        },
        {
          id: 'enrollment-b',
          userId: USER_ID,
          programSlug: SECOND_PROGRAM,
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
        },
      ]);
      mocks.rollupFindMany.mockResolvedValue(
        otherProgramState === 'complete'
          ? [
              {
                userId: USER_ID,
                programSlug: CANONICAL_PROGRAM,
                coursesCompleted: completionSpec.totalCourses,
              },
            ]
          : [],
      );
      mocks.progressGroupBy.mockResolvedValue(
        otherProgramState === 'fresh'
          ? [
              {
                userId: USER_ID,
                programSlug: CANONICAL_PROGRAM,
                _max: { lastUpdatedAt: new Date() },
              },
            ]
          : [],
      );
      mocks.userFindMany.mockResolvedValue([
        { id: USER_ID, staleTrainingDetectedAt: new Date('2026-08-01T00:00:00.000Z') },
      ]);

      const result = await runStaleCourseraTrainingCheck();

      expect(result).toMatchObject({
        cleared: 0,
        newlyFlagged: 0,
        unchangedStale: 1,
        reStamped: 1,
      });
      expect(mocks.userUpdateMany).toHaveBeenCalledTimes(1);
      expect(mocks.userUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: [USER_ID] },
          staleTrainingDetectedAt: { not: null },
        },
        data: { staleTrainingDetectedAt: expect.any(Date) },
      });
    },
  );

  it('checks every enrollment through deterministic cursor pagination beyond 500 rows', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `enrollment-${String(index).padStart(4, '0')}`,
      userId: `member-${String(index).padStart(4, '0')}`,
      programSlug: CANONICAL_PROGRAM,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
    }));
    const finalEnrollment = {
      id: 'enrollment-0500',
      userId: 'member-0500',
      programSlug: CANONICAL_PROGRAM,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
    };
    mocks.enrollmentFindMany
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([finalEnrollment]);
    mocks.rollupFindMany.mockResolvedValue([]);
    mocks.progressGroupBy.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue(
      [...firstPage, finalEnrollment].map((enrollment) => ({
        id: enrollment.userId,
        staleTrainingDetectedAt: null,
      })),
    );
    mocks.userUpdateMany.mockResolvedValue({ count: 501 });

    const result = await runStaleCourseraTrainingCheck();

    expect(result).toMatchObject({
      enrollmentsChecked: 501,
      newlyFlagged: 501,
      cleared: 0,
      reStamped: 0,
    });
    expect(mocks.enrollmentFindMany).toHaveBeenCalledTimes(2);
    expect(mocks.enrollmentFindMany.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        take: 500,
        orderBy: { id: 'asc' },
      }),
    );
    expect(mocks.enrollmentFindMany.mock.calls[0]?.[0]).not.toHaveProperty('cursor');
    expect(mocks.enrollmentFindMany.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        take: 500,
        orderBy: { id: 'asc' },
        cursor: { id: 'enrollment-0499' },
        skip: 1,
      }),
    );
  });
});
