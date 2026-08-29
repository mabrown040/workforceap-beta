import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseProgressStatus } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  rawFindMany: vi.fn(),
  rawFindFirst: vi.fn(),
  badgeFindFirst: vi.fn(),
  canonicalFindMany: vi.fn(),
  userFindMany: vi.fn(),
  userFindFirst: vi.fn(),
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  loadMappings: vi.fn(),
  upsertMerged: vi.fn(),
  refreshRollup: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => {
  const db = {
    courseraCourseProgress: {
      findMany: mocks.rawFindMany,
      findFirst: mocks.rawFindFirst,
    },
    courseraBadgeProgress: {
      findFirst: mocks.badgeFindFirst,
    },
    courseProgress: {
      findMany: mocks.canonicalFindMany,
      upsert: vi.fn(),
    },
    user: {
      findMany: mocks.userFindMany,
      findFirst: mocks.userFindFirst,
    },
    $executeRaw: mocks.executeRaw,
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
  };
  return { prisma: db };
});
vi.mock('@/lib/coursera/canonicalMapping', () => ({
  loadCanonicalMappingsForCourseraIds: mocks.loadMappings,
}));
vi.mock('@/lib/coursera/upsertMergedCourseProgress', () => ({
  upsertMergedCourseProgress: mocks.upsertMerged,
}));
vi.mock('@/lib/member/courseProgress', () => ({
  refreshMemberProgramProgressRollup: mocks.refreshRollup,
}));

import {
  backfillUserIdForCourseraEmail,
  promoteCsvProgressToCanonical,
} from '@/lib/coursera/csvImport.server';

describe('promoteCsvProgressToCanonical', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rawFindMany
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: 'raw-1',
          userId: 'user-1',
          courseraCourseId: 'coursera-course-1',
          overallProgress: 24,
          isCompleted: false,
          enrollmentTime: new Date('2026-08-01T00:00:00.000Z'),
          classStartTime: null,
          lastActivityTime: new Date('2026-08-22T00:00:00.000Z'),
          completionTime: null,
          courseGrade: null,
        },
      ])
      .mockResolvedValueOnce([]);
    mocks.loadMappings.mockResolvedValue({
      byCourseraCourseId: new Map([
        [
          'coursera-course-1',
          {
            programSlug: 'comptia-a-plus',
            courseSlug: 'hardware-fundamentals',
          },
        ],
      ]),
      byCourseraCourseSlug: new Map(),
    });
    mocks.userFindMany.mockResolvedValue([{ id: 'user-1' }]);
    mocks.userFindFirst.mockResolvedValue({ id: 'user-1' });
    mocks.rawFindFirst.mockResolvedValue(null);
    mocks.badgeFindFirst.mockResolvedValue(null);
    mocks.executeRaw.mockResolvedValue(0);
    mocks.queryRaw.mockResolvedValue([{}]);
    mocks.transaction.mockImplementation(async (callback) => {
      const { prisma } = await import('@/lib/db/prisma');
      return callback(prisma as never);
    });
    mocks.canonicalFindMany.mockResolvedValue([
      {
        userId: 'user-1',
        programSlug: 'comptia-a-professional-certificate',
        courseSlug: 'hardware-fundamentals',
        status: CourseProgressStatus.COMPLETED,
        percentComplete: 100,
        lastActivityAt: new Date('2026-08-21T00:00:00.000Z'),
      },
    ]);
    mocks.upsertMerged.mockResolvedValue({ newlyCompleted: false });
    mocks.refreshRollup.mockResolvedValue(undefined);
  });

  it('scopes the mapped email, uses the merge helper, and preserves COMPLETED', async () => {
    const result = await promoteCsvProgressToCanonical({
      organizationId: 'org-1',
      userId: 'user-1',
      courseraEmail: ' Learner@Example.com ',
    });

    expect(mocks.rawFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-1',
          externalEmail: { equals: 'learner@example.com', mode: 'insensitive' },
        }),
      }),
    );
    expect(mocks.upsertMerged).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMerged).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        programSlug: 'comptia-a-professional-certificate',
        courseSlug: 'hardware-fundamentals',
        merged: expect.objectContaining({
          status: CourseProgressStatus.COMPLETED,
          percentComplete: 100,
        }),
      }),
    );
    expect(mocks.refreshRollup).toHaveBeenCalledWith(
      'user-1',
      'comptia-a-professional-certificate',
    );
    expect(result).toEqual({
      upserted: 1,
      unmapped: 0,
      rollupsRefreshed: 1,
      errors: 0,
    });
  });

  it('leaves a raw row linked to a foreign organization untouched', async () => {
    mocks.userFindMany.mockResolvedValue([]);

    const result = await promoteCsvProgressToCanonical({
      organizationId: 'org-1',
      userId: 'user-1',
    });

    expect(mocks.rawFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
    expect(mocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['user-1'] },
          organizationId: 'org-1',
        }),
      }),
    );
    expect(mocks.upsertMerged).not.toHaveBeenCalled();
    expect(mocks.refreshRollup).not.toHaveBeenCalled();
    expect(result).toMatchObject({ upserted: 0, errors: 1 });
  });

  it('adopts NULL-org raw rows only for the reviewed organization and user', async () => {
    mocks.rawFindMany.mockReset().mockResolvedValue([]);
    mocks.executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const result = await backfillUserIdForCourseraEmail(
      ' Learner@Example.com ',
      'user-1',
      'org-1',
    );

    expect(result.courseRowsUpdated).toBe(2);
    expect(result.badgeRowsUpdated).toBe(1);
    expect(mocks.rawFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          externalEmail: { equals: 'learner@example.com', mode: 'insensitive' },
          OR: expect.any(Array),
        }),
      }),
    );
    expect(mocks.executeRaw).toHaveBeenCalledTimes(2);
    for (const [statement] of mocks.executeRaw.mock.calls) {
      const sql = (statement as { sql: string }).sql;
      const values = (statement as { values: unknown[] }).values;
      expect(sql).toContain('organization_id IS NULL OR organization_id =');
      expect(sql).toContain('user_id IS NULL OR user_id =');
      expect(values).toContain('org-1');
    }
  });

  it('rejects reviewed attachment when the email has raw progress owned elsewhere', async () => {
    mocks.rawFindMany.mockReset().mockResolvedValue([]);
    mocks.rawFindFirst.mockResolvedValue({ id: 'foreign-course-row' });

    await expect(
      backfillUserIdForCourseraEmail('learner@example.com', 'user-1', 'org-1'),
    ).rejects.toThrow('another user or organization');
    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });

  it('rejects a map target outside the reviewed organization before any raw write', async () => {
    mocks.userFindFirst.mockResolvedValue(null);

    await expect(
      backfillUserIdForCourseraEmail('learner@example.com', 'foreign-user', 'org-1'),
    ).rejects.toThrow('expected organization');
    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });
});
