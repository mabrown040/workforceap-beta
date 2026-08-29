import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/xapi/mappings', () => ({
  ensureCourseraMappingTables: vi.fn(),
}));
vi.mock('@/lib/coursera/resolveUserIdByEmail', () => ({
  resolveUserIdByCourseraEmail: vi.fn(),
}));

import { attachRawCourseraProgressToUser } from '@/lib/coursera/csvImport.server';

describe('Stage A raw Coursera attachment', () => {
  const queryRaw = vi.fn();
  const executeRaw = vi.fn();
  const db = { $queryRaw: queryRaw, $executeRaw: executeRaw } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw
      .mockResolvedValueOnce([]) // global email advisory lock
      .mockResolvedValueOnce([{ id: 'user-1' }]) // active target, FOR SHARE
      .mockResolvedValueOnce([]); // no existing ownership conflict
    executeRaw.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
  });

  it('locks, validates, and adopts course plus badge rows as one caller-owned unit', async () => {
    const result = await attachRawCourseraProgressToUser(
      {
        courseraEmail: ' Learner@Example.com ',
        userId: 'user-1',
        expectedOrganizationId: 'org-1',
      },
      db,
    );

    expect(result).toEqual({ courseRowsUpdated: 2, badgeRowsUpdated: 3 });
    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(executeRaw).toHaveBeenCalledTimes(2);

    const lock = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(lock.sql).toContain('pg_advisory_xact_lock');
    expect(lock.values).toContain('coursera:raw-email:learner@example.com');

    const target = queryRaw.mock.calls[1]?.[0] as { sql: string; values: unknown[] };
    expect(target.sql).toContain('FOR SHARE');
    expect(target.values).toEqual(expect.arrayContaining(['user-1', 'org-1']));

    const courseUpdate = executeRaw.mock.calls[0]?.[0] as { sql: string };
    const badgeUpdate = executeRaw.mock.calls[1]?.[0] as { sql: string };
    expect(courseUpdate.sql).toContain('UPDATE coursera_course_progress');
    expect(badgeUpdate.sql).toContain('UPDATE coursera_badge_progress');
  });

  it('fails before either update when any existing row has another owner', async () => {
    queryRaw.mockReset();
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([{ source: 'course' }]);

    await expect(
      attachRawCourseraProgressToUser(
        {
          courseraEmail: 'learner@example.com',
          userId: 'user-1',
          expectedOrganizationId: 'org-1',
        },
        db,
      ),
    ).rejects.toThrow('different user or organization');
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('fails before ownership inspection when the target user is outside the organization', async () => {
    queryRaw.mockReset();
    queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(
      attachRawCourseraProgressToUser(
        {
          courseraEmail: 'learner@example.com',
          userId: 'user-2',
          expectedOrganizationId: 'org-1',
        },
        db,
      ),
    ).rejects.toThrow('active member of the expected organization');
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
