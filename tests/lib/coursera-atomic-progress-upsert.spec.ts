import { CourseProgressStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { upsertMergedCourseProgress } from '@/lib/coursera/upsertMergedCourseProgress';

describe('upsertMergedCourseProgress atomic merge ladder', () => {
  it('keeps COMPLETED at the database conflict point during concurrent stale writes', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
        statements.push(statement);
        if (statement.sql.includes('pg_advisory_xact_lock')) return [{}];
        if (statement.sql.includes('SELECT status')) return [];
        const incomingCompleted = statement.values.includes(CourseProgressStatus.COMPLETED);
        return [{
          status: CourseProgressStatus.COMPLETED,
          inserted: incomingCompleted,
        }];
      }),
    };

    const results = await Promise.all([
      upsertMergedCourseProgress(db as never, {
        userId: 'user-1',
        programSlug: 'program-one',
        courseSlug: 'course-one',
        courseId: 'provider-course-1',
        merged: {
          status: CourseProgressStatus.COMPLETED,
          percentComplete: 100,
          lastActivityAt: new Date('2026-08-29T12:00:00.000Z'),
        },
        existing: null,
        completedAt: new Date('2026-08-29T12:00:00.000Z'),
        scoreScaled: 0.9,
        scoreRaw: 90,
        statementCountIncrement: 1,
      }),
      upsertMergedCourseProgress(db as never, {
        userId: 'user-1',
        programSlug: 'program-one',
        courseSlug: 'course-one',
        courseId: 'provider-course-1',
        merged: {
          status: CourseProgressStatus.IN_PROGRESS,
          percentComplete: 20,
          lastActivityAt: new Date('2026-08-29T12:01:00.000Z'),
        },
        existing: null,
        completedAt: null,
      }),
    ]);

    expect(results).toEqual([
      { newlyCompleted: true },
      { newlyCompleted: false },
    ]);
    expect(
      statements.filter((statement) => statement.sql.includes('pg_advisory_xact_lock')),
    ).toHaveLength(2);
    expect(
      statements.filter((statement) => statement.sql.includes('FOR UPDATE')),
    ).toHaveLength(2);
    const writes = statements.filter((statement) =>
      statement.sql.includes('INSERT INTO course_progress'),
    );
    expect(writes).toHaveLength(2);
    for (const statement of writes) {
      const sql = statement.sql;
      expect(sql).toContain('ON CONFLICT (user_id, program_slug, course_slug) DO UPDATE');
      expect(sql).toContain(
        "WHEN course_progress.status = 'COMPLETED'::\"course_progress_status\"",
      );
      expect(sql).toContain(
        "OR EXCLUDED.status = 'COMPLETED'::\"course_progress_status\"",
      );
      expect(sql).toContain('THEN 100');
      expect(sql).toContain(
        'GREATEST(0, course_progress.percent_complete, EXCLUDED.percent_complete)',
      );
      expect(sql).toContain('LEAST(\n          100,');
      expect(sql).toContain('GREATEST(course_progress.score_raw, EXCLUDED.score_raw)');
      expect(sql).toContain('statement_count = course_progress.statement_count +');
    }
  });

  it('bounds malformed provider percentages before insert and at the conflict ladder', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
        statements.push(statement);
        if (statement.sql.includes('pg_advisory_xact_lock')) return [{}];
        if (statement.sql.includes('SELECT status')) return [];
        return [{ status: CourseProgressStatus.IN_PROGRESS, inserted: true }];
      }),
    };

    await upsertMergedCourseProgress(db as never, {
      userId: 'user-1',
      programSlug: 'program-one',
      courseSlug: 'course-one',
      courseId: 'provider-course-1',
      merged: {
        status: CourseProgressStatus.IN_PROGRESS,
        percentComplete: 150,
        lastActivityAt: null,
      },
      existing: null,
      completedAt: null,
    });

    const write = statements.find((statement) =>
      statement.sql.includes('INSERT INTO course_progress'),
    );
    expect(write?.values.filter((value) => value === 100)).toHaveLength(2);
    expect(write?.values).not.toContain(150);
    expect(write?.sql).toContain(
      'GREATEST(0, course_progress.percent_complete, EXCLUDED.percent_complete)',
    );
    expect(write?.sql).toContain(
      'GREATEST(0, course_progress.progress_pct, EXCLUDED.progress_pct)',
    );
  });
});
