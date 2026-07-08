import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

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

const CSV_UPSERT_CHUNK = 100;

function chunkCsvRows<T>(arr: T[], size = CSV_UPSERT_CHUNK): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function bulkUpsertCourseProgressChunk(
  items: Array<{
    row: ParsedCourseActivityRow;
    lowerEmail: string;
    userId: string | null;
    source: string;
  }>,
): Promise<{ inserted: number; updated: number }> {
  if (items.length === 0) return { inserted: 0, updated: 0 };

  const tuples = items.map(({ row, lowerEmail, userId, source }) =>
    Prisma.sql`(
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
    )`,
  );

  const rows = await prisma.$queryRaw<Array<{ inserted: boolean }>>`
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
    ) VALUES ${Prisma.join(tuples, ', ')}
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

  let inserted = 0;
  let updated = 0;
  for (const r of rows) {
    if (r.inserted) inserted += 1;
    else updated += 1;
  }
  return { inserted, updated };
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

  type PreparedCourseRow = {
    row: ParsedCourseActivityRow;
    lowerEmail: string;
    userId: string | null;
    source: string;
  };

  const pending: PreparedCourseRow[] = [];

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

    pending.push({ row, lowerEmail, userId, source });
  }

  const upsertPreparedChunk = async (chunk: PreparedCourseRow[]) => {
    try {
      const sums = await bulkUpsertCourseProgressChunk(chunk);
      inserted += sums.inserted;
      updated += sums.updated;
    } catch {
      for (const item of chunk) {
        try {
          const sums = await bulkUpsertCourseProgressChunk([item]);
          inserted += sums.inserted;
          updated += sums.updated;
        } catch (error) {
          errors.push(
            `Upsert failed for ${item.row.email} / ${item.row.courseId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  };

  for (const chunk of chunkCsvRows(pending)) {
    await upsertPreparedChunk(chunk);
  }

  const promotion = await promoteCsvProgressToCanonical();
  if (promotion.errors > 0) {
    errors.push(`Promotion to course_progress failed for ${promotion.errors} batch — see server logs`);
  }
  return {
    inserted,
    updated,
    resolvedToUsers,
    unresolved,
    errors,
    unresolvedRows,
    promoted: promotion.upserted,
    promotionErrors: promotion.errors,
  };
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

async function bulkUpsertBadgeProgressChunk(
  items: Array<{
    row: BadgeAggregate;
    lowerEmail: string;
    userId: string | null;
    source: string;
  }>,
): Promise<{ inserted: number; updated: number }> {
  if (items.length === 0) return { inserted: 0, updated: 0 };

  const tuples = items.map(({ row, lowerEmail, userId, source }) =>
    Prisma.sql`(
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
    )`,
  );

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
    ) VALUES ${Prisma.join(tuples, ', ')}
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

  let inserted = 0;
  let updated = 0;
  for (const r of upsertRows) {
    if (r.inserted) inserted += 1;
    else updated += 1;
  }
  return { inserted, updated };
}

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
  const source = options.source?.trim() || 'csv_import';

  let inserted = 0;
  let updated = 0;
  let resolvedToUsers = 0;
  let unresolved = 0;
  const errors: string[] = [];
  const unresolvedRows: BadgeIngestResult['unresolvedRows'] = [];

  const aggregates = aggregateBadgeRows(rows);

  const userIdCache = new Map<string, string | null>();

  type PreparedBadgeRow = {
    row: BadgeAggregate;
    lowerEmail: string;
    userId: string | null;
    source: string;
  };

  const pending: PreparedBadgeRow[] = [];

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

    pending.push({ row, lowerEmail, userId, source });
  }

  const upsertPreparedChunk = async (chunk: PreparedBadgeRow[]) => {
    try {
      const sums = await bulkUpsertBadgeProgressChunk(chunk);
      inserted += sums.inserted;
      updated += sums.updated;
    } catch {
      for (const item of chunk) {
        try {
          const sums = await bulkUpsertBadgeProgressChunk([item]);
          inserted += sums.inserted;
          updated += sums.updated;
        } catch (error) {
          errors.push(
            `Upsert failed for ${item.row.email} / ${item.row.badgeSlug}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  };

  for (const chunk of chunkCsvRows(pending)) {
    await upsertPreparedChunk(chunk);
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
 * One-time backfill: for every coursera_identity_mappings row, find orphaned
 * coursera_course_progress / coursera_badge_progress rows with NULL user_id
 * and link them. Then promote into course_progress.
 *
 * Idempotent — safe to re-run. Each individual email backfill is the same
 * as `backfillUserIdForCourseraEmail`, so re-running does not duplicate
 * course_progress rows (ON CONFLICT upsert) and does not send completion
 * emails (promoteCsvProgressToCanonical never triggers emails).
 */
export async function backfillAllOrphanedCourseraProgress(): Promise<{
  mappingsProcessed: number;
  totalCourseRowsUpdated: number;
  totalBadgeRowsUpdated: number;
  errors: string[];
}> {
  const mappings = await prisma.$queryRaw<
    Array<{ userId: string; courseraEmail: string }>
  >`
    SELECT user_id AS "userId", coursera_email AS "courseraEmail"
    FROM coursera_identity_mappings
    WHERE coursera_email IS NOT NULL
    ORDER BY updated_at DESC
  `;

  let totalCourseRowsUpdated = 0;
  let totalBadgeRowsUpdated = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      const result = await backfillUserIdForCourseraEmail(
        mapping.courseraEmail,
        mapping.userId
      );
      totalCourseRowsUpdated += result.courseRowsUpdated;
      totalBadgeRowsUpdated += result.badgeRowsUpdated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      errors.push(
        `Backfill failed for ${mapping.courseraEmail} (${mapping.userId}): ${message}`
      );
    }
  }

  return {
    mappingsProcessed: mappings.length,
    totalCourseRowsUpdated,
    totalBadgeRowsUpdated,
    errors,
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

  // Resolution order for the (program_slug, course_slug) we write to
  // course_progress:
  //   1. Admin-curated mapping in coursera_canonical_course_mappings
  //      (overrides everything; this is the row created by the inline
  //      "Map this" action on /admin/training-progress).
  //   2. Raw Coursera (program_slug, coursera_course_slug) — the legacy
  //      behavior. This works for courses where the Coursera slug happens
  //      to match a canonical curriculum slug, and is harmless for others
  //      (the dashboard simply won't render the row).
  //
  // Without #1 the dashboard misses real progress for any course whose
  // Coursera slug differs from its canonical curriculum slug — which is
  // why a learner enrolled in `introduction-to-artificial-intelligence-ai`
  // shows 0/16 against the canonical AI Practitioner Certificate
  // curriculum until an admin maps the course.
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
        score_scaled,
        started_at,
        completed_at
      )
      SELECT
        gen_random_uuid(),
        ccp.user_id,
        COALESCE(m.canonical_program_slug, ccp.program_slug),
        COALESCE(m.canonical_course_slug,  ccp.coursera_course_slug),
        ccp.coursera_course_id,
        CASE
          WHEN ccp.is_completed          THEN 'COMPLETED'::"CourseProgressStatus"
          WHEN ccp.overall_progress > 0  THEN 'IN_PROGRESS'::"CourseProgressStatus"
          ELSE                                'NOT_STARTED'::"CourseProgressStatus"
        END,
        LEAST(ROUND(ccp.overall_progress::numeric)::int, 100),
        CASE
          WHEN ccp.course_grade IS NOT NULL
               AND TRIM(ccp.course_grade) ~ '^[0-9]+(\.[0-9]+)?\s*%?\s*$'
          THEN LEAST(
                1.0::double precision,
                GREATEST(
                  0.0::double precision,
                  CASE
                    WHEN regexp_replace(TRIM(ccp.course_grade), '%$', '')::double precision > 1
                    THEN regexp_replace(TRIM(ccp.course_grade), '%$', '')::double precision / 100.0
                    ELSE regexp_replace(TRIM(ccp.course_grade), '%$', '')::double precision
                  END
                )
              )
          ELSE NULL
        END,
        COALESCE(ccp.class_start_time, ccp.enrollment_time),
        ccp.completion_time
      FROM coursera_course_progress ccp
      LEFT JOIN coursera_canonical_course_mappings m
        ON m.coursera_course_id = ccp.coursera_course_id
      WHERE ccp.user_id IS NOT NULL
        AND COALESCE(m.canonical_course_slug, ccp.coursera_course_slug) IS NOT NULL
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
        score_scaled     = COALESCE(course_progress.score_scaled, EXCLUDED.score_scaled),
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
