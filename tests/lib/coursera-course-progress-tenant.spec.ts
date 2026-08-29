import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureTenantKeys: vi.fn(),
  userFindFirst: vi.fn(),
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
    mocks.userFindFirst.mockResolvedValue({ organizationId: 'org-1' });
    mocks.rawFindFirst.mockResolvedValue(null);
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([]) // global advisory lock
      .mockResolvedValueOnce([]) // no legacy ownership conflict
      .mockResolvedValueOnce([{ userId: 'user-1' }]); // tenant upsert
    mocks.executeRaw.mockResolvedValue(1);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: { findFirst: mocks.userFindFirst },
        courseraCourseProgress: { findFirst: mocks.rawFindFirst },
        $queryRaw: mocks.queryRaw,
        $executeRaw: mocks.executeRaw,
      }),
    );
  });

  it('rejects a linked user from another organization before writing raw progress', async () => {
    mocks.userFindFirst.mockResolvedValue({ organizationId: 'org-2' });

    await expect(upsertCourseraCourseProgress(input)).rejects.toThrow(
      'does not belong to the expected organization',
    );
    expect(mocks.rawFindFirst).not.toHaveBeenCalled();
    expect(mocks.queryRaw).not.toHaveBeenCalled();
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
    const lockStatement = mocks.queryRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(lockStatement.sql).toContain('pg_advisory_xact_lock');
    expect(lockStatement.values).toContain('coursera:raw-email:learner@example.com');

    const conflictStatement = mocks.queryRaw.mock.calls[1]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(conflictStatement.sql).toContain("THEN 'foreign-organization'");
    expect(conflictStatement.sql).toContain('existing_user.organization_id');
    expect(conflictStatement.values).toContain('org-1');

    const adoptionStatement = mocks.executeRaw.mock.calls[0]?.[0] as {
      sql?: string;
      values?: unknown[];
    };
    expect(adoptionStatement.sql).toContain('existing.organization_id IS NULL');
    expect(adoptionStatement.values).toContain('org-1');

    const statement = mocks.queryRaw.mock.calls[2]?.[0] as { sql?: string; values?: unknown[] };
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
    expect(mocks.executeRaw).not.toHaveBeenCalled();
    expect(mocks.rawFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a concurrent attempt to attach the same tenant row to another user', async () => {
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(upsertCourseraCourseProgress(input)).rejects.toThrow(
      'concurrent linked row',
    );
  });
});
