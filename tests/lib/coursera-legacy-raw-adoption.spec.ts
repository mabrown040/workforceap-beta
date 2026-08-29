import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  adoptLegacyRawBadgeProgressRows,
  adoptLegacyRawCourseProgressRows,
  lockLegacyRawCourseraEmails,
} from '@/lib/coursera/legacyRawProgressAdoption.server';

describe('legacy raw Coursera tenant adoption', () => {
  const queryRaw = vi.fn();
  const executeRaw = vi.fn();
  const db = { $queryRaw: queryRaw, $executeRaw: executeRaw } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    executeRaw.mockResolvedValue(1);
  });

  it('locks the global email identity, validates ownership, then adopts a NULL-org course row', async () => {
    queryRaw
      .mockResolvedValueOnce([]) // advisory lock
      .mockResolvedValueOnce([]); // ownership validation

    const adopted = await adoptLegacyRawCourseProgressRows(db, {
      organizationId: 'org-1',
      identities: [
        {
          externalEmail: ' Learner@Example.com ',
          courseraCourseId: 'course-1',
          userId: 'user-1',
        },
      ],
    });

    expect(adopted).toBe(1);
    const lock = queryRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(lock.sql).toContain('pg_advisory_xact_lock');
    expect(lock.values).toContain('coursera:raw-email:learner@example.com');

    const validation = queryRaw.mock.calls[1]?.[0] as {
      sql: string;
      values: unknown[];
    };
    expect(validation.sql).toContain("THEN 'incoming-user-outside-organization'");
    expect(validation.sql).toContain("THEN 'foreign-organization'");
    expect(validation.sql).toContain("THEN 'existing-user-outside-organization'");
    expect(validation.values).toContain('org-1');

    const update = executeRaw.mock.calls[0]?.[0] as { sql: string; values: unknown[] };
    expect(update.sql).toContain('UPDATE coursera_course_progress existing');
    expect(update.sql).toContain('existing.organization_id IS NULL');
    expect(update.values).toContain('org-1');
  });

  it('rejects a non-NULL foreign-organization course identity without adopting it', async () => {
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          kind: 'foreign-organization',
          externalEmail: 'learner@example.com',
          externalKey: 'course-1',
        },
      ]);

    await expect(
      adoptLegacyRawCourseProgressRows(db, {
        organizationId: 'org-1',
        identities: [
          {
            externalEmail: 'learner@example.com',
            courseraCourseId: 'course-1',
            userId: null,
          },
        ],
      }),
    ).rejects.toThrow('foreign-organization');
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('rejects conflicting incoming users before taking a database lock', async () => {
    await expect(
      adoptLegacyRawCourseProgressRows(db, {
        organizationId: 'org-1',
        identities: [
          {
            externalEmail: 'learner@example.com',
            courseraCourseId: 'course-1',
            userId: 'user-1',
          },
          {
            externalEmail: 'LEARNER@example.com',
            courseraCourseId: 'course-1',
            userId: 'user-2',
          },
        ],
      }),
    ).rejects.toThrow('conflicting learner identities');
    expect(queryRaw).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it('applies the same ownership gate to badge rows', async () => {
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const adopted = await adoptLegacyRawBadgeProgressRows(db, {
      organizationId: 'org-1',
      identities: [
        {
          externalEmail: 'learner@example.com',
          badgeSlug: 'badge-1',
          userId: null,
        },
      ],
    });

    expect(adopted).toBe(1);
    const validation = queryRaw.mock.calls[1]?.[0] as { sql: string };
    expect(validation.sql).toContain('LEFT JOIN coursera_badge_progress existing');
    const update = executeRaw.mock.calls[0]?.[0] as { sql: string };
    expect(update.sql).toContain('UPDATE coursera_badge_progress existing');
  });

  it('deduplicates and sorts global email locks to avoid cross-batch deadlocks', async () => {
    queryRaw.mockResolvedValue([]);

    await lockLegacyRawCourseraEmails(db, [
      'z@example.com',
      ' A@example.com ',
      'a@example.com',
    ]);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    const statement = queryRaw.mock.calls[0]?.[0] as {
      sql: string;
      values: unknown[];
    };
    expect(statement.sql).toContain('FROM (VALUES');
    expect(statement.sql).toContain('ORDER BY input.lock_key');
    expect(statement.sql).toContain('ORDER BY ordered.lock_key');
    expect(statement.values).toEqual([
      'coursera:raw-email:a@example.com',
      'coursera:raw-email:z@example.com',
    ]);
  });
});
