import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  upsert: vi.fn(),
  createMemberEvent: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
    user: { findUnique: vi.fn(async () => ({ coursesCompleted: [] })), update: vi.fn() },
    courseProgress: { findMany: vi.fn(async () => []) },
    memberProgramProgress: { upsert: vi.fn() },
  },
}));

import {
  claimLiveCourseCompletionEvent,
  markCourseProgressCompleted,
} from '@/lib/member/courseProgress';

describe('markCourseProgressCompleted atomic transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(1);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        $queryRaw: mocks.queryRaw,
        $executeRaw: mocks.executeRaw,
        courseProgress: { upsert: mocks.upsert },
        memberEvent: { create: mocks.createMemberEvent },
      }),
    );
  });

  it('locks the canonical program and recognizes a completed alias row', async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([
        {
          courseSlug: 'technical-support-fundamentals',
          status: 'COMPLETED',
          percentComplete: 100,
          lastActivityAt: new Date('2026-08-29T12:00:00Z'),
        },
      ]);

    const result = await markCourseProgressCompleted({
      userId: 'user-1',
      programSlug: 'comptia-a-professional-certificate',
      courseSlug: 'technical-support-fundamentals',
      courseId: 'course-1',
    });

    const lockStatement = mocks.executeRaw.mock.calls[0]?.[0] as { sql?: string };
    const readStatement = mocks.queryRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(lockStatement.sql).toContain('pg_advisory_xact_lock');
    expect(readStatement.sql).toContain('FOR UPDATE');
    expect(readStatement.values).toContain('comptia-a-plus');
    expect(readStatement.values).toContain('comptia-a-professional-certificate');
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(result.newlyCompleted).toBe(false);
  });

  it('claims a live completion event under the canonical program/course advisory lock', async () => {
    mocks.queryRaw.mockResolvedValueOnce([]);
    mocks.createMemberEvent.mockResolvedValueOnce({ id: 'event-1' });

    const claimed = await claimLiveCourseCompletionEvent({
      userId: 'user-1',
      programSlug: 'comptia-a-plus',
      courseSlug: 'technical-support-fundamentals',
      courseName: 'Technical Support Fundamentals',
      completedCount: 1,
      source: 'coursera-webhook',
    });

    const lockStatement = mocks.executeRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    const eventRead = mocks.queryRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(lockStatement.sql).toContain('pg_advisory_xact_lock');
    expect(lockStatement.values).toContain(
      'course-completion-event:user-1:comptia-a-professional-certificate::technical-support-fundamentals',
    );
    expect(eventRead.sql).toContain('member_events');
    expect(eventRead.values).toContain(
      'comptia-a-professional-certificate::technical-support-fundamentals',
    );
    expect(mocks.createMemberEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventName: 'course_completed',
          entityId: 'technical-support-fundamentals',
          metadata: expect.objectContaining({
            programSlug: 'comptia-a-professional-certificate',
            courseCompletionKey:
              'comptia-a-professional-certificate::technical-support-fundamentals',
          }),
        }),
      }),
    );
    expect(claimed).toBe(true);
  });

  it.each([null, new Date('2020-01-01T12:00:00Z'), undefined])(
    'separates known/unknown provider activity %s from the completion write time', async (learnerActivityAt) => {
      mocks.queryRaw.mockResolvedValueOnce([{
        courseSlug: 'technical-support-fundamentals', status: 'IN_PROGRESS', percentComplete: 40,
        lastActivityAt: new Date('2026-09-01T12:00:00Z'),
      }]);
      const before = new Date();
      await markCourseProgressCompleted({
        userId: 'user-1', programSlug: 'comptia-a-professional-certificate',
        courseSlug: 'technical-support-fundamentals', learnerActivityAt,
      });
      const { create, update } = mocks.upsert.mock.calls[0][0];
      expect(update).not.toHaveProperty('lastActivityAt');
      expect(create.completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(update.completedAt).toEqual(create.completedAt);
      if (learnerActivityAt === undefined) expect(create.lastActivityAt).toEqual(create.completedAt);
      else expect(create.lastActivityAt).toEqual(learnerActivityAt);
      const activityUpdate = mocks.executeRaw.mock.calls.map(([query]) => query as { sql: string; values: unknown[] })
        .find((query) => query.sql.includes('UPDATE course_progress'));
      if (learnerActivityAt === null) expect(activityUpdate).toBeUndefined();
      else {
        expect(activityUpdate?.sql).toContain('last_activity_at IS NULL OR last_activity_at <');
        expect(activityUpdate?.values[0]).toEqual(create.lastActivityAt);
      }
    },
  );

  it('does not claim or recreate an existing canonical completion event', async () => {
    mocks.queryRaw.mockResolvedValueOnce([{ id: 'event-existing' }]);

    const claimed = await claimLiveCourseCompletionEvent({
      userId: 'user-1',
      programSlug: 'comptia-a-professional-certificate',
      courseSlug: 'technical-support-fundamentals',
      courseName: 'Technical Support Fundamentals',
      completedCount: 1,
      source: 'member',
    });

    expect(claimed).toBe(false);
    expect(mocks.createMemberEvent).not.toHaveBeenCalled();
  });
});
