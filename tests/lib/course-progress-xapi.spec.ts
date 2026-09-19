import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/coursera/canonicalMapping', () => ({
  findCanonicalMappingForCourseraCourse: vi.fn(),
  loadCanonicalMappingsForCourseraIds: vi.fn(async () => ({
    byCourseraCourseId: new Map([[
      'coursera-course-1',
      {
        programSlug: 'comptia-a-plus',
        courseSlug: 'technical-support-fundamentals',
      },
    ]]),
    byCourseraCourseSlug: new Map(),
  })),
}));
vi.mock('@/lib/content/courseraDiscoveredCatalog', () => ({
  DISCOVERED_COURSERA_PROGRAMS: {},
}));
vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(() => ({
    slug: 'comptia-a-professional-certificate',
    title: 'CompTIA A+',
    courses: [
      { slug: 'technical-support-fundamentals', name: 'Technical Support Fundamentals' },
    ],
  })),
}));
vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: vi.fn(async () => ({
    courses: [
      {
        slug: 'technical-support-fundamentals',
        name: 'Technical Support Fundamentals',
        estimatedHours: 10,
        courseraCourseId: 'coursera-course-1',
      },
    ],
  })),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ $queryRaw: mocks.queryRaw, $executeRaw: mocks.executeRaw })),
    user: {
      findUnique: vi.fn(async ({ select }: { select: Record<string, boolean> }) =>
        select.organizationId
          ? { organizationId: 'org-1' }
          : { coursesCompleted: [] }),
      update: vi.fn(),
    },
    courseProgress: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      findMany: vi.fn(async () => [
        {
          status: 'IN_PROGRESS',
          percentComplete: 40,
          courseSlug: 'technical-support-fundamentals',
          courseId: 'coursera-course-1',
        },
      ]),
    },
    memberProgramProgress: { upsert: vi.fn(async () => ({})) },
  },
}));

import { findCanonicalMappingForCourseraCourse } from '@/lib/coursera/canonicalMapping';
import { prisma } from '@/lib/db/prisma';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { buildCourseraRestSyntheticStatement } from '@/lib/coursera/restWebhookStatement';
import { parseXapiStatement } from '@/lib/xapi/statementModel';
import { xapiLearnerActivityAt } from '@/lib/xapi/activityTimestamp';
import { deriveEnrollmentSignal } from '@/lib/admin/courseraEnrollmentEvidence';

describe('xAPI canonical progress without enrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(1);
    mocks.queryRaw.mockImplementation(async (statement: { sql?: string }) => {
      if (statement.sql?.includes('SELECT status')) return [];
      if (statement.sql?.includes('INSERT INTO course_progress')) {
        return [{ status: 'IN_PROGRESS', inserted: true }];
      }
      return [];
    });
    vi.mocked(findCanonicalMappingForCourseraCourse).mockResolvedValue({
      programSlug: 'comptia-a-plus',
      courseSlug: 'technical-support-fundamentals',
    });
  });

  it('writes a canonical in-progress row from an exact course id with no enrollment', async () => {
    const result = await upsertCourseProgressFromXapiStatement({
      userId: 'user-1',
      enrolledProgramSlug: null,
      parsed: {
        email: 'learner@example.com',
        statementId: 'statement-progress-1',
        verbId: 'http://adlnet.gov/expapi/verbs/progressed',
        courseraCourseId: 'coursera-course-1',
        activityType: 'course',
        resultProgressPercent: 40,
        rawStatement: {},
      },
    });

    const lock = mocks.executeRaw.mock.calls
      .map(([statement]) => statement as { sql?: string })
      .find((statement) => statement.sql?.includes('pg_advisory_xact_lock'));
    expect(lock).toBeDefined();

    const write = mocks.queryRaw.mock.calls
      .map(([statement]) => statement as { sql?: string; values?: unknown[] })
      .find((statement) => statement.sql?.includes('INSERT INTO course_progress'));
    expect(write?.sql).toContain(
      'ON CONFLICT (user_id, program_slug, course_slug) DO UPDATE',
    );
    expect(write?.sql).toContain(
      "WHEN course_progress.status = 'COMPLETED'::\"course_progress_status\"",
    );
    expect(write?.sql).toContain(
      'GREATEST(0, course_progress.percent_complete, EXCLUDED.percent_complete)',
    );
    expect(write?.sql).toContain(
      'statement_count = course_progress.statement_count +',
    );
    expect(write?.values).toEqual(expect.arrayContaining([
      'user-1',
      'comptia-a-professional-certificate',
      'technical-support-fundamentals',
      'coursera-course-1',
      40,
    ]));
    expect(prisma.courseProgress.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      programSlug: 'comptia-a-professional-certificate',
      courseSlug: 'technical-support-fundamentals',
      courseName: 'Technical Support Fundamentals',
      courseraCourseId: 'coursera-course-1',
      trainingStartedTransition: true,
    });
    expect(prisma.courseProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          programSlug: {
            in: expect.arrayContaining([
              'comptia-a-professional-certificate',
              'comptia-a-plus',
            ]),
          },
        },
      }),
    );
  });

  it('carries a validated REST 37% course fact through the real progress writer', async () => {
    const parsed = buildCourseraRestSyntheticStatement({
      contentId: 'coursera-course-1', progressPercent: 37,
    }, 'learner@example.com', {});
    await upsertCourseProgressFromXapiStatement({ userId: 'user-1', enrolledProgramSlug: null, parsed });
    const write = mocks.queryRaw.mock.calls
      .map(([statement]) => statement as { sql?: string; values?: unknown[] })
      .find((statement) => statement.sql?.includes('INSERT INTO course_progress'));
    expect(write?.values).toContain(37);
    expect(write?.values).not.toContain('COMPLETED');
  });

  it.each(['course', 'item'])('does not promote a %s grade into course progress', async (activityType) => {
    const parsed = parseXapiStatement({
      id: 'grade-only', actor: { mbox: 'mailto:learner@example.com' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/progressed' },
      object: { definition: { type: `http://adlnet.gov/expapi/activities/${activityType}` } },
      context: { extensions: { 'http://coursera.org/xapi/extensions/courseId': 'coursera-course-1' } },
      result: { score: { scaled: 0.9 }, ...(activityType === 'item' ? { progress: 0.95 } : {}) },
    });
    await upsertCourseProgressFromXapiStatement({
      userId: 'user-1', enrolledProgramSlug: null, parsed: parsed!,
    });
    const write = mocks.queryRaw.mock.calls
      .map(([statement]) => statement as { sql?: string; values?: unknown[] })
      .find((statement) => statement.sql?.includes('INSERT INTO course_progress'));
    expect(write).toBeDefined();
    expect(write?.values).not.toContain(90);
    expect(write?.values).not.toContain(95);
    if (activityType === 'item') expect(write?.values).not.toContain(0.9);
    else expect(write?.values).toContain(0.9);
  });

  it.each([
    ['old replay', '2020-01-01T12:00:00Z', 'stalled'],
    ['undated event', undefined, 'activity_unknown'],
    ['invalid timestamp', 'not-a-date', 'activity_unknown'],
    ['future timestamp', '2099-01-01T12:00:00Z', 'activity_unknown'],
    ['recent event', new Date(Date.now() - 60_000).toISOString(), 'active'],
  ])('writes learner time for %s without inventing recent activity', async (_label, timestamp, signal) => {
    const parsed = parseXapiStatement({
      id: 'timestamp-fixture', timestamp, stored: new Date().toISOString(),
      actor: { mbox: 'mailto:learner@example.com' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/progressed' },
      object: { definition: { type: 'http://adlnet.gov/expapi/activities/course' } },
      context: { extensions: { 'http://coursera.org/xapi/extensions/courseId': 'coursera-course-1' } },
    })!;
    await upsertCourseProgressFromXapiStatement({ userId: 'user-1', enrolledProgramSlug: null, parsed });
    const write = mocks.queryRaw.mock.calls
      .map(([statement]) => statement as { sql?: string; values: unknown[] })
      .find((statement) => statement.sql?.includes('INSERT INTO course_progress'))!;
    // The real shared SQL binds last_activity_at after started_at/completed_at.
    const lastActivityAt = write.values[11] as Date | null;
    expect(lastActivityAt).toEqual(xapiLearnerActivityAt(timestamp));
    expect(deriveEnrollmentSignal({ approved: true, completed: false, observedActivity: true,
      lastActivityAt, now: new Date() })).toBe(signal);
    expect(write.sql).toContain('WHEN EXCLUDED.last_activity_at IS NULL THEN course_progress.last_activity_at');
    expect(write.sql).toContain('GREATEST(course_progress.last_activity_at, EXCLUDED.last_activity_at)');
  });

  it('does not treat an unvalidated REST audit timestamp as learner activity', async () => {
    const parsed = buildCourseraRestSyntheticStatement({ contentId: 'coursera-course-1', progressPercent: 37 },
      'learner@example.com', { timestamp: new Date().toISOString() });
    await upsertCourseProgressFromXapiStatement({ userId: 'user-1', enrolledProgramSlug: null, parsed });
    const write = mocks.queryRaw.mock.calls
      .map(([statement]) => statement as { sql?: string; values: unknown[] })
      .find((statement) => statement.sql?.includes('INSERT INTO course_progress'))!;
    expect(write.values[11]).toBeNull();
  });
});

describe('xAPI event timestamp validation', () => {
  it.each([undefined, null, 1_700_000_000_000, '', '2026-02-30T12:00:00Z', '2026-01-01',
    '2026-01-01T12:00:00', '1999-01-01T12:00:00Z', '2099-01-01T12:00:00Z'])('rejects %s', (value) => {
    expect(xapiLearnerActivityAt(value)).toBeNull();
  });
  it('accepts timezone-qualified event times without changing the instant', () => {
    expect(xapiLearnerActivityAt('2026-01-01T12:00:00-05:00')).toEqual(new Date('2026-01-01T17:00:00Z'));
  });
});
