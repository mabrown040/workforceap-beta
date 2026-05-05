import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ensureCourseraMappingTables } from '@/lib/xapi/mappings';

import type {
  BadgeIngestResult,
  IngestResult,
  ParsedBadgeRow,
  ParsedCourseActivityRow,
} from './csvImport';

type UserMatch = { id: string };

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const lower = email.toLowerCase();

  const directRows = await prisma.$queryRaw<UserMatch[]>`
    SELECT id FROM users WHERE LOWER(email) = ${lower} AND deleted_at IS NULL LIMIT 1
  `;
  if (directRows[0]?.id) return directRows[0].id;

  const mappingRows = await prisma.$queryRaw<UserMatch[]>`
    SELECT user_id AS id
    FROM coursera_identity_mappings
    WHERE LOWER(coursera_email) = ${lower}
    LIMIT 1
  `;
  return mappingRows[0]?.id ?? null;
}

/**
 * Idempotency: ensures the unique expression index on (lower(external_email),
 * coursera_course_id) exists. The CREATE INDEX in the migration already covers this,
 * but in the same spirit as ensureCourseraMappingTables (runtime DDL fallback) we
 * keep this defensive create here so the upsert ON CONFLICT target always resolves.
 */
let ensureProgressIndexPromise: Promise<void> | null = null;

async function ensureProgressIndex() {
  if (!ensureProgressIndexPromise) {
    ensureProgressIndexPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS coursera_course_progress_email_course_key
        ON coursera_course_progress (LOWER(external_email), coursera_course_id)
      `);
    })().catch((error) => {
      ensureProgressIndexPromise = null;
      throw error;
    });
  }
  await ensureProgressIndexPromise;
}

/**
 * Upsert each parsed row into `coursera_course_progress`. Resolves `user_id`
 * by direct email match first, then falls back to coursera_identity_mappings.
 *
 * Idempotent on (lower(external_email), coursera_course_id) — re-running the
 * same CSV updates the existing row rather than duplicating.
 */
export async function ingestCourseActivityRows(
  rows: ParsedCourseActivityRow[],
  options: { source?: string } = {}
): Promise<IngestResult> {
  // Ensure the identity mapping tables exist (xAPI module manages those at runtime).
  await ensureCourseraMappingTables();
  await ensureProgressIndex();

  const source = options.source?.trim() || 'csv_import';

  let inserted = 0;
  let updated = 0;
  let resolvedToUsers = 0;
  let unresolved = 0;
  const errors: string[] = [];
  const unresolvedRows: IngestResult['unresolvedRows'] = [];

  // Cache lookups within a single ingest batch — a typical CSV has many rows
  // per learner across courses.
  const userIdCache = new Map<string, string | null>();

  for (const row of rows) {
    const lowerEmail = row.email.toLowerCase();

    let userId: string | null;
    if (userIdCache.has(lowerEmail)) {
      userId = userIdCache.get(lowerEmail) ?? null;
    } else {
      try {
        userId = await resolveUserIdByEmail(row.email);
      } catch (error) {
        userId = null;
        errors.push(
          `Failed to resolve user for ${row.email}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      userIdCache.set(lowerEmail, userId);
    }

    if (userId) {
      resolvedToUsers += 1;
    } else {
      unresolved += 1;
      unresolvedRows.push({
        email: row.email,
        name: row.name,
        courseId: row.courseId,
        course: row.course,
      });
    }

    try {
      const upsertRows = await prisma.$queryRaw<Array<{ inserted: boolean }>>`
        INSERT INTO coursera_course_progress (
          id,
          user_id,
          external_email,
          external_name,
          coursera_course_id,
          coursera_course_slug,
          course_name,
          university,
          collection_name,
          collection_id,
          program_slug,
          program_name,
          enrollment_time,
          class_start_time,
          class_end_time,
          last_activity_time,
          completion_time,
          overall_progress,
          learning_hours,
          is_completed,
          is_removed_from_program,
          course_grade,
          certificate_url,
          contract_name,
          contract_active,
          source,
          last_synced_at
        ) VALUES (
          gen_random_uuid(),
          ${userId},
          ${lowerEmail},
          ${row.name || null},
          ${row.courseId},
          ${row.courseSlug},
          ${row.course},
          ${row.university},
          ${row.collectionName},
          ${row.collectionId},
          ${row.programSlug},
          ${row.programName},
          ${row.enrollmentTime},
          ${row.classStartTime},
          ${row.classEndTime},
          ${row.lastActivityTime},
          ${row.completionTime},
          ${row.overallProgress},
          ${row.learningHours},
          ${row.completed},
          ${row.removedFromProgram},
          ${row.courseGrade},
          ${row.courseCertificateUrl},
          ${row.contractName},
          ${row.isEnterpriseContractActive},
          ${source},
          now()
        )
        ON CONFLICT (LOWER(external_email), coursera_course_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, coursera_course_progress.user_id),
          external_name = EXCLUDED.external_name,
          coursera_course_slug = EXCLUDED.coursera_course_slug,
          course_name = EXCLUDED.course_name,
          university = EXCLUDED.university,
          collection_name = EXCLUDED.collection_name,
          collection_id = EXCLUDED.collection_id,
          program_slug = EXCLUDED.program_slug,
          program_name = EXCLUDED.program_name,
          enrollment_time = EXCLUDED.enrollment_time,
          class_start_time = EXCLUDED.class_start_time,
          class_end_time = EXCLUDED.class_end_time,
          last_activity_time = EXCLUDED.last_activity_time,
          completion_time = EXCLUDED.completion_time,
          overall_progress = EXCLUDED.overall_progress,
          learning_hours = EXCLUDED.learning_hours,
          is_completed = EXCLUDED.is_completed,
          is_removed_from_program = EXCLUDED.is_removed_from_program,
          course_grade = EXCLUDED.course_grade,
          certificate_url = EXCLUDED.certificate_url,
          contract_name = EXCLUDED.contract_name,
          contract_active = EXCLUDED.contract_active,
          source = EXCLUDED.source,
          last_synced_at = now()
        RETURNING (xmax = 0) AS inserted
      `;
      if (upsertRows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      errors.push(
        `Upsert failed for ${row.email} / ${row.courseId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const promotion = await promoteCsvProgressToCanonical();
  return { inserted, updated, resolvedToUsers, unresolved, errors, unresolvedRows, promoted: promotion.upserted };
}

/**
 * Idempotency: ensures the unique expression index on (lower(external_email),
 * badge_slug) exists. Mirrors ensureProgressIndex above for the badge table.
 */
let ensureBadgeProgressIndexPromise: Promise<void> | null = null;

async function ensureBadgeProgressIndex() {
  if (!ensureBadgeProgressIndexPromise) {
    ensureBadgeProgressIndexPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS coursera_badge_progress_email_badge_key
        ON coursera_badge_progress (LOWER(external_email), badge_slug)
      `);
    })().catch((error) => {
      ensureBadgeProgressIndexPromise = null;
      throw error;
    });
  }
  await ensureBadgeProgressIndexPromise;
}

type BadgeAggregate = {
  name: string;
  email: string;
  badgeTitle: string;
  badgeSlug: string;
  badgeLink: string | null;
  numberOfCourses: number;
  progressPercent: number;
  coursesCompleted: number;
  currentCourseName: string | null;
  badgeCompleted: boolean;
  badgeCompletionTime: Date | null;
  lastActivityTime: Date | null;
  totalLearningHours: number;
  collectionId: string | null;
  collectionName: string | null;
};

/**
 * Group the per-(learner, course-within-badge) rows from the CSV into one
 * record per (learner, badgeSlug). For each group:
 *   - take the first row's badge-level fields (identical across rows)
 *   - count rows where Is Course Completed = "Yes" → coursesCompleted
 *   - pick currentCourseName from the most recently active in-progress course
 *     (max courseEnrollmentDate among isCourseCompleted=false rows; falls back
 *     to the latest row in the group if all are completed)
 *   - take MAX(lastActivityTime) across the group
 */
function aggregateBadgeRows(rows: ParsedBadgeRow[]): BadgeAggregate[] {
  const groups = new Map<string, ParsedBadgeRow[]>();

  for (const row of rows) {
    const key = `${row.email.toLowerCase()}::${row.badgeSlug}`;
    const list = groups.get(key);
    if (list) {
      list.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const aggregates: BadgeAggregate[] = [];

  for (const groupRows of groups.values()) {
    const first = groupRows[0];

    let coursesCompleted = 0;
    let lastActivityTime: Date | null = null;
    let inProgressCandidate: { name: string; ts: number } | null = null;
    let fallbackCandidate: { name: string; ts: number } | null = null;

    for (const row of groupRows) {
      if (row.isCourseCompleted) coursesCompleted += 1;

      if (row.lastActivityTime) {
        const t = row.lastActivityTime.getTime();
        if (!lastActivityTime || t > lastActivityTime.getTime()) {
          lastActivityTime = row.lastActivityTime;
        }
      }

      const enrollmentTs = row.courseEnrollmentDate ? row.courseEnrollmentDate.getTime() : 0;
      if (row.courseName) {
        if (!row.isCourseCompleted) {
          if (!inProgressCandidate || enrollmentTs > inProgressCandidate.ts) {
            inProgressCandidate = { name: row.courseName, ts: enrollmentTs };
          }
        }
        if (!fallbackCandidate || enrollmentTs > fallbackCandidate.ts) {
          fallbackCandidate = { name: row.courseName, ts: enrollmentTs };
        }
      }
    }

    const currentCourseName =
      inProgressCandidate?.name ?? fallbackCandidate?.name ?? null;

    aggregates.push({
      name: first.name,
      email: first.email,
      badgeTitle: first.badgeTitle,
      badgeSlug: first.badgeSlug,
      badgeLink: first.badgeLink,
      numberOfCourses: first.numberOfCourses,
      progressPercent: first.progressPercent,
      coursesCompleted,
      currentCourseName,
      badgeCompleted: first.badgeCompleted,
      badgeCompletionTime: first.badgeCompletionTime,
      lastActivityTime,
      totalLearningHours: first.totalLearningHours,
      collectionId: first.collectionId,
      collectionName: first.collectionName,
    });
  }

  return aggregates;
}

/**
 * Upsert each (learner, badge) aggregate into `coursera_badge_progress`.
 * Resolves `user_id` by direct email match first, then falls back to
 * coursera_identity_mappings.
 *
 * Idempotent on (lower(external_email), badge_slug) — re-running the same CSV
 * updates the existing row rather than duplicating.
 */
export async function ingestLearningPathActivityRows(
  rows: ParsedBadgeRow[],
  options: { source?: string } = {}
): Promise<BadgeIngestResult> {
  await ensureCourseraMappingTables();
  await ensureBadgeProgressIndex();

  const source = options.source?.trim() || 'csv_import';

  let inserted = 0;
  let updated = 0;
  let resolvedToUsers = 0;
  let unresolved = 0;
  const errors: string[] = [];
  const unresolvedRows: BadgeIngestResult['unresolvedRows'] = [];

  const aggregates = aggregateBadgeRows(rows);

  const userIdCache = new Map<string, string | null>();

  for (const row of aggregates) {
    const lowerEmail = row.email.toLowerCase();

    let userId: string | null;
    if (userIdCache.has(lowerEmail)) {
      userId = userIdCache.get(lowerEmail) ?? null;
    } else {
      try {
        userId = await resolveUserIdByEmail(row.email);
      } catch (error) {
        userId = null;
        errors.push(
          `Failed to resolve user for ${row.email}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      userIdCache.set(lowerEmail, userId);
    }

    if (userId) {
      resolvedToUsers += 1;
    } else {
      unresolved += 1;
      unresolvedRows.push({
        email: row.email,
        name: row.name,
        badgeSlug: row.badgeSlug,
        badgeTitle: row.badgeTitle,
      });
    }

    try {
      const upsertRows = await prisma.$queryRaw<Array<{ inserted: boolean }>>`
        INSERT INTO coursera_badge_progress (
          id,
          user_id,
          external_email,
          external_name,
          badge_slug,
          badge_title,
          badge_link,
          number_of_courses,
          progress_percent,
          courses_completed,
          current_course_name,
          badge_completed,
          badge_completion_time,
          last_activity_time,
          total_learning_hours,
          collection_id,
          collection_name,
          source,
          last_synced_at
        ) VALUES (
          gen_random_uuid(),
          ${userId},
          ${lowerEmail},
          ${row.name || null},
          ${row.badgeSlug},
          ${row.badgeTitle},
          ${row.badgeLink},
          ${row.numberOfCourses},
          ${row.progressPercent},
          ${row.coursesCompleted},
          ${row.currentCourseName},
          ${row.badgeCompleted},
          ${row.badgeCompletionTime},
          ${row.lastActivityTime},
          ${row.totalLearningHours},
          ${row.collectionId},
          ${row.collectionName},
          ${source},
          now()
        )
        ON CONFLICT (LOWER(external_email), badge_slug) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, coursera_badge_progress.user_id),
          external_name = EXCLUDED.external_name,
          badge_title = EXCLUDED.badge_title,
          badge_link = EXCLUDED.badge_link,
          number_of_courses = EXCLUDED.number_of_courses,
          progress_percent = EXCLUDED.progress_percent,
          courses_completed = EXCLUDED.courses_completed,
          current_course_name = EXCLUDED.current_course_name,
          badge_completed = EXCLUDED.badge_completed,
          badge_completion_time = EXCLUDED.badge_completion_time,
          last_activity_time = EXCLUDED.last_activity_time,
          total_learning_hours = EXCLUDED.total_learning_hours,
          collection_id = EXCLUDED.collection_id,
          collection_name = EXCLUDED.collection_name,
          source = EXCLUDED.source,
          last_synced_at = now()
        RETURNING (xmax = 0) AS inserted
      `;
      if (upsertRows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      errors.push(
        `Upsert failed for ${row.email} / ${row.badgeSlug}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { inserted, updated, resolvedToUsers, unresolved, errors, unresolvedRows };
}

/**
 * Backfill `user_id` on existing coursera_course_progress and
 * coursera_badge_progress rows for a given Coursera email. Used by the admin
 * "Map to WAP user…" action so historical CSV rows pick up the user binding
 * without re-running the CSV import.
 */
export async function backfillUserIdForCourseraEmail(
  courseraEmail: string,
  userId: string
): Promise<{ courseRowsUpdated: number; badgeRowsUpdated: number }> {
  const lower = courseraEmail.trim().toLowerCase();
  if (!lower) return { courseRowsUpdated: 0, badgeRowsUpdated: 0 };

  const courseRowsUpdated = await prisma.$executeRaw`
    UPDATE coursera_course_progress
    SET user_id = ${userId}
    WHERE LOWER(external_email) = ${lower}
      AND user_id IS NULL
  `;

  const badgeRowsUpdated = await prisma.$executeRaw`
    UPDATE coursera_badge_progress
    SET user_id = ${userId}
    WHERE LOWER(external_email) = ${lower}
      AND user_id IS NULL
  `;

  // Immediately promote the newly-linked rows into course_progress so the
  // member dashboard reflects the historical CSV data without waiting for xAPI.
  await promoteCsvProgressToCanonical({ userId });

  return {
    courseRowsUpdated: Number(courseRowsUpdated) || 0,
    badgeRowsUpdated: Number(badgeRowsUpdated) || 0,
  };
}

/**
 * Promote all `coursera_course_progress` rows that have a resolved `user_id`
 * into the canonical `course_progress` table that feeds the member training
 * dashboard. Idempotent — safe to call on every CSV import and after every
 * identity mapping. Uses GREATEST/COALESCE so it never downgrades existing
 * xAPI-sourced progress.
 *
 * @param options.userId - When provided, only promotes rows for that member
 *   (used after a new identity mapping is saved).
 */
export async function promoteCsvProgressToCanonical(
  options: { userId?: string } = {}
): Promise<{ upserted: number; errors: number }> {
  const userFilter = options.userId
    ? Prisma.sql`AND ccp.user_id = ${options.userId}`
    : Prisma.sql``;

  try {
    const upserted = await prisma.$executeRaw`
      INSERT INTO course_progress (
        id,
        user_id,
        program_slug,
        course_slug,
        course_id,
        status,
        percent_complete,
        started_at,
        completed_at
      )
      SELECT
        gen_random_uuid(),
        ccp.user_id,
        ccp.program_slug,
        ccp.coursera_course_slug,
        ccp.coursera_course_id,
        CASE
          WHEN ccp.is_completed          THEN 'COMPLETED'::"CourseProgressStatus"
          WHEN ccp.overall_progress > 0  THEN 'IN_PROGRESS'::"CourseProgressStatus"
          ELSE                                'NOT_STARTED'::"CourseProgressStatus"
        END,
        LEAST(ROUND(ccp.overall_progress::numeric)::int, 100),
        COALESCE(ccp.class_start_time, ccp.enrollment_time),
        ccp.completion_time
      FROM coursera_course_progress ccp
      WHERE ccp.user_id IS NOT NULL
        AND ccp.coursera_course_slug IS NOT NULL
        AND ccp.is_removed_from_program = false
        ${userFilter}
      ON CONFLICT (user_id, program_slug, course_slug) DO UPDATE SET
        status          = CASE
                            WHEN EXCLUDED.status = 'COMPLETED'::"CourseProgressStatus"
                              THEN 'COMPLETED'::"CourseProgressStatus"
                            WHEN course_progress.status = 'COMPLETED'::"CourseProgressStatus"
                              THEN 'COMPLETED'::"CourseProgressStatus"
                            ELSE EXCLUDED.status
                          END,
        percent_complete = GREATEST(course_progress.percent_complete, EXCLUDED.percent_complete),
        started_at       = COALESCE(course_progress.started_at, EXCLUDED.started_at),
        completed_at     = COALESCE(EXCLUDED.completed_at, course_progress.completed_at),
        course_id        = COALESCE(EXCLUDED.course_id, course_progress.course_id)
    `;
    return { upserted: Number(upserted) || 0, errors: 0 };
  } catch (error) {
    console.error('[promoteCsvProgressToCanonical] failed', error);
    return { upserted: 0, errors: 1 };
  }
}
