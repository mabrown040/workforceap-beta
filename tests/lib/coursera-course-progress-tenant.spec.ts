import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureTenantKeys: vi.fn(),
  rawFindFirst: vi.fn(),
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/coursera/rawProgressTenantKeys', () => ({
  ensureCourseProgressTenantKeys: mocks.ensureTenantKeys,
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { upsertCourseraCourseProgress } from '@/lib/coursera/upsertCourseraCourseProgress';

const input = {
  externalEmail: 'Learner@Example.com',
  courseraCourseId: 'course-1',
  courseName: 'Course One',
  programSlug: 'program-one',
  overallProgress: 25,
  isCompleted: false,
  userId: 'user-1',
  organizationId: 'org-1',
};

describe('upsertCourseraCourseProgress tenant identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTenantKeys.mockResolvedValue(undefined);
    mocks.rawFindFirst.mockResolvedValue(null);
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([]) // no existing linked users
      .mockResolvedValueOnce([{ id: 'user-1' }]) // incoming user FOR SHARE
      .mockResolvedValueOnce([]) // no legacy ownership conflict
      .mockResolvedValueOnce([{ userId: 'user-1' }]); // tenant upsert
    mocks.executeRaw.mockResolvedValue(1);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        courseraCourseProgress: { findFirst: mocks.rawFindFirst },
        $queryRaw: mocks.queryRaw,
        $executeRaw: mocks.executeRaw,
      }),
    );
  });

  it('rejects a linked user from another organization before writing raw progress', async () => {
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(upsertCourseraCourseProgress(input)).rejects.toThrow(
      'linked-user-outside-organization',
    );
    expect(mocks.rawFindFirst).not.toHaveBeenCalled();
    expect(
      mocks.executeRaw.mock.calls.filter(
        ([statement]) => !(statement as { sql?: string }).sql?.includes('pg_advisory_xact_lock'),
      ),
    ).toHaveLength(0);
  });

  it('looks up and conflicts on the organization-local raw identity', async () => {
    await upsertCourseraCourseProgress(input);

    expect(mocks.rawFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          externalEmail: { equals: 'learner@example.com', mode: 'insensitive' },
          courseraCourseId: 'course-1',
        },
      }),
    );
    const lockStatement = mocks.executeRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(lockStatement.sql).toContain('pg_advisory_xact_lock');
    expect(lockStatement.values).toContain('coursera:raw-email:learner@example.com');

    const linkedUserStatement = mocks.queryRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(linkedUserStatement.sql).toContain('INNER JOIN coursera_course_progress existing');
    expect(linkedUserStatement.values).toEqual(
      expect.arrayContaining(['learner@example.com', 'course-1', 'user-1']),
    );

    const userLockStatement = mocks.queryRaw.mock.calls[1]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(userLockStatement.sql).toContain('candidate_user.deleted_at IS NULL');
    expect(userLockStatement.sql).toContain('FOR SHARE');
    expect(userLockStatement.values).toEqual(expect.arrayContaining(['user-1', 'org-1']));

    const conflictStatement = mocks.queryRaw.mock.calls[2]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(conflictStatement.sql).toContain("THEN 'foreign-organization'");
    expect(conflictStatement.sql).toContain('existing_user.organization_id');
    expect(conflictStatement.values).toContain('org-1');

    const adoptionStatement = mocks.executeRaw.mock.calls[1]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(adoptionStatement.sql).toContain('existing.organization_id IS NULL');
    expect(adoptionStatement.values).toContain('org-1');

    const statement = mocks.queryRaw.mock.calls[3]?.[0] as { sql?: string; values?: unknown[] };
    expect(statement.sql).toContain(
      'ON CONFLICT (\n        organization_id,\n        LOWER(external_email),\n        coursera_course_id',
    );
    expect(statement.sql).toContain('FROM users incoming_insert_user');
    expect(statement.sql).toContain(
      'incoming_insert_user.organization_id =',
    );
    expect(statement.values).toContain('org-1');
  });

  it('rejects a legacy identity already owned by another organization before lookup/upsert', async () => {
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([
        {
          kind: 'foreign-organization',
          externalEmail: 'learner@example.com',
          externalKey: 'course-1',
        },
      ]);

    await expect(upsertCourseraCourseProgress(input)).rejects.toThrow(
      'foreign-organization',
    );
    expect(
      mocks.executeRaw.mock.calls.filter(
        ([statement]) => !(statement as { sql?: string }).sql?.includes('pg_advisory_xact_lock'),
      ),
    ).toHaveLength(0);
    expect(mocks.rawFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a concurrent attempt to attach the same tenant row to another user', async () => {
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(upsertCourseraCourseProgress(input)).rejects.toThrow(
      'concurrent linked row',
    );
  });
});
