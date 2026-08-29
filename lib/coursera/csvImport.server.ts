import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ensureCourseraMappingTables } from '@/lib/xapi/mappings';
import { resolveUserIdByCourseraEmail } from '@/lib/coursera/resolveUserIdByEmail';

import type {
  BadgeIngestResult,
  IngestResult,
  ParsedBadgeRow,
  ParsedCourseActivityRow,
} from './csvImport';

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  return resolveUserIdByCourseraEmail(email);
}

/**
 * Idempotency: ensures the unique expression index on (lower(external_email),
 * coursera_course_id) exists. The CREATE INDEX in the migration already covers this,
 * but in the same spirit as ensureCourseraMappingTables (runtime DDL fallback) we
 * keep this defensive create here so the upsert ON CONFLICT target always resolves.
 */
let ensureProgressIndexPromise: Promise<void> | null = null;

const CSV_UPSERT_CHUNK = 100;

function chunkCsvRows<T>(arr: T[], size = CSV_UPSERT_CHUNK): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Serialize legacy global raw-progress identities by normalized email.
 *
 * Stage A deliberately keeps the existing global conflict targets so the
 * currently serving deployment remains compatible. The next tenant-key
 * release uses this exact lock key/order while it adopts historical rows.
 */
export async function lockLegacyRawCourseraEmails(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  emails: string[],
): Promise<void> {
  const lockKeys = [...new Set(
    emails
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => `coursera:raw-email:${email}`),
  )].sort();
  if (lockKeys.length === 0) return;

  const tuples = lockKeys.map((lockKey) => Prisma.sql`(${lockKey}::text)`);
  await db.$queryRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(hashtextextended(ordered.lock_key, 0))
    FROM (
      SELECT input.lock_key
      FROM (VALUES ${Prisma.join(tuples, ', ')}) AS input(lock_key)
      GROUP BY input.lock_key
      ORDER BY input.lock_key
      OFFSET 0
    ) AS ordered
    ORDER BY ordered.lock_key
  `);
}

async function assertRawWriterUsersBelongToOrganization(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  organizationId: string,
  userIds: Array<string | null>,
): Promise<void> {
  const normalizedOrganizationId = organizationId.trim();
  if (!normalizedOrganizationId) {
    throw new Error('Coursera raw progress requires an organization id');
  }

  const expectedUserIds = [...new Set(userIds.filter((id): id is string => Boolean(id)))].sort();
  if (expectedUserIds.length === 0) return;

  const matchedUsers = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT candidate_user.id
    FROM users AS candidate_user
    WHERE candidate_user.id IN (${Prisma.join(expectedUserIds)})
      AND candidate_user.organization_id = ${normalizedOrganizationId}
      AND candidate_user.deleted_at IS NULL
    ORDER BY candidate_user.id
    FOR SHARE
  `);
  if (matchedUsers.length !== expectedUserIds.length) {
    throw new Error('Coursera raw progress user does not belong to the importing organization');
  }
}

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

async function bulkUpsertCourseProgressChunk(
  items: Array<{
    row: ParsedCourseActivityRow;
    lowerEmail: string;
    userId: string | null;
    source: string;
  }>,
  organizationId: string,
): Promise<{ inserted: number; updated: number }> {
  if (items.length === 0) return { inserted: 0, updated: 0 };
  const normalizedOrganizationId = organizationId.trim();
  if (!normalizedOrganizationId) {
    throw new Error('Coursera raw progress requires an organization id');
  }

  const tuples = items.map(({ row, lowerEmail, userId, source }) =>
    Prisma.sql`(
      gen_random_uuid(),
      ${userId},
      ${normalizedOrganizationId},
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

  return prisma.$transaction(async (tx) => {
    await lockLegacyRawCourseraEmails(
      tx,
      items.map((item) => item.lowerEmail),
    );
    await assertRawWriterUsersBelongToOrganization(
      tx,
      normalizedOrganizationId,
      items.map((item) => item.userId),
    );

    const rows = await tx.$queryRaw<Array<{ inserted: boolean }>>`
      INSERT INTO coursera_course_progress (
      id,
      user_id,
      organization_id,
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
      user_id = COALESCE(coursera_course_progress.user_id, EXCLUDED.user_id),
      organization_id = COALESCE(coursera_course_progress.organization_id, EXCLUDED.organization_id),
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
      last_activity_time = COALESCE(
        GREATEST(coursera_course_progress.last_activity_time, EXCLUDED.last_activity_time),
        coursera_course_progress.last_activity_time,
        EXCLUDED.last_activity_time
      ),
      completion_time = COALESCE(
        coursera_course_progress.completion_time,
        EXCLUDED.completion_time
      ),
      overall_progress = GREATEST(
        coursera_course_progress.overall_progress,
        EXCLUDED.overall_progress
      ),
      learning_hours = GREATEST(
        coursera_course_progress.learning_hours,
        EXCLUDED.learning_hours
      ),
      is_completed = coursera_course_progress.is_completed OR EXCLUDED.is_completed,
      is_removed_from_program = EXCLUDED.is_removed_from_program,
      course_grade = COALESCE(EXCLUDED.course_grade, coursera_course_progress.course_grade),
      certificate_url = COALESCE(
        coursera_course_progress.certificate_url,
        EXCLUDED.certificate_url
      ),
      contract_name = EXCLUDED.contract_name,
      contract_active = EXCLUDED.contract_active,
      source = EXCLUDED.source,
      last_synced_at = now()
      WHERE
        (
          coursera_course_progress.organization_id IS NULL
          OR coursera_course_progress.organization_id = EXCLUDED.organization_id
        )
        AND (
          coursera_course_progress.user_id IS NULL
          OR EXCLUDED.user_id IS NULL
          OR coursera_course_progress.user_id = EXCLUDED.user_id
        )
        AND (
          coursera_course_progress.user_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM users AS linked_user
            WHERE linked_user.id = coursera_course_progress.user_id
              AND linked_user.organization_id = EXCLUDED.organization_id
              AND linked_user.deleted_at IS NULL
          )
        )
      RETURNING (xmax = 0) AS inserted
    `;

    if (rows.length !== items.length) {
      throw new Error('Coursera raw course progress ownership conflict');
    }

    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      if (row.inserted) inserted += 1;
      else updated += 1;
    }
    return { inserted, updated };
  });
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
  options: { source?: string; organizationId: string }
): Promise<IngestResult> {
  // Ensure the identity mapping tables exist (xAPI module manages those at runtime).
  await ensureCourseraMappingTables();
  await ensureProgressIndex();

  const source = options.source?.trim() || 'csv_import';
  const organizationId = options.organizationId;

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
      const sums = await bulkUpsertCourseProgressChunk(chunk, organizationId);
      inserted += sums.inserted;
      updated += sums.updated;
    } catch {
      for (const item of chunk) {
        try {
          const sums = await bulkUpsertCourseProgressChunk([item], organizationId);
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

async function bulkUpsertBadgeProgressChunk(
  items: Array<{
    row: BadgeAggregate;
    lowerEmail: string;
    userId: string | null;
    source: string;
  }>,
  organizationId: string,
): Promise<{ inserted: number; updated: number }> {
  if (items.length === 0) return { inserted: 0, updated: 0 };
  const normalizedOrganizationId = organizationId.trim();
  if (!normalizedOrganizationId) {
    throw new Error('Coursera raw progress requires an organization id');
  }

  const tuples = items.map(({ row, lowerEmail, userId, source }) =>
    Prisma.sql`(
      gen_random_uuid(),
      ${userId},
      ${normalizedOrganizationId},
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

  return prisma.$transaction(async (tx) => {
    await lockLegacyRawCourseraEmails(
      tx,
      items.map((item) => item.lowerEmail),
    );
    await assertRawWriterUsersBelongToOrganization(
      tx,
      normalizedOrganizationId,
      items.map((item) => item.userId),
    );

    const upsertRows = await tx.$queryRaw<Array<{ inserted: boolean }>>`
      INSERT INTO coursera_badge_progress (
      id,
      user_id,
      organization_id,
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
      user_id = COALESCE(coursera_badge_progress.user_id, EXCLUDED.user_id),
      organization_id = COALESCE(coursera_badge_progress.organization_id, EXCLUDED.organization_id),
      external_name = EXCLUDED.external_name,
      badge_title = EXCLUDED.badge_title,
      badge_link = COALESCE(coursera_badge_progress.badge_link, EXCLUDED.badge_link),
      number_of_courses = GREATEST(
        coursera_badge_progress.number_of_courses,
        EXCLUDED.number_of_courses
      ),
      progress_percent = GREATEST(
        coursera_badge_progress.progress_percent,
        EXCLUDED.progress_percent
      ),
      courses_completed = GREATEST(
        coursera_badge_progress.courses_completed,
        EXCLUDED.courses_completed
      ),
      current_course_name = EXCLUDED.current_course_name,
      badge_completed = coursera_badge_progress.badge_completed OR EXCLUDED.badge_completed,
      badge_completion_time = COALESCE(
        coursera_badge_progress.badge_completion_time,
        EXCLUDED.badge_completion_time
      ),
      last_activity_time = COALESCE(
        GREATEST(coursera_badge_progress.last_activity_time, EXCLUDED.last_activity_time),
        coursera_badge_progress.last_activity_time,
        EXCLUDED.last_activity_time
      ),
      total_learning_hours = GREATEST(
        coursera_badge_progress.total_learning_hours,
        EXCLUDED.total_learning_hours
      ),
      collection_id = EXCLUDED.collection_id,
      collection_name = EXCLUDED.collection_name,
      source = EXCLUDED.source,
      last_synced_at = now()
      WHERE
        (
          coursera_badge_progress.organization_id IS NULL
          OR coursera_badge_progress.organization_id = EXCLUDED.organization_id
        )
        AND (
          coursera_badge_progress.user_id IS NULL
          OR EXCLUDED.user_id IS NULL
          OR coursera_badge_progress.user_id = EXCLUDED.user_id
        )
        AND (
          coursera_badge_progress.user_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM users AS linked_user
            WHERE linked_user.id = coursera_badge_progress.user_id
              AND linked_user.organization_id = EXCLUDED.organization_id
              AND linked_user.deleted_at IS NULL
          )
        )
      RETURNING (xmax = 0) AS inserted
    `;

    if (upsertRows.length !== items.length) {
      throw new Error('Coursera raw badge progress ownership conflict');
    }

    let inserted = 0;
    let updated = 0;
    for (const row of upsertRows) {
      if (row.inserted) inserted += 1;
      else updated += 1;
    }
    return { inserted, updated };
  });
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
  options: { source?: string; organizationId: string }
): Promise<BadgeIngestResult> {
  await ensureCourseraMappingTables();
  await ensureBadgeProgressIndex();

  const source = options.source?.trim() || 'csv_import';
  const organizationId = options.organizationId;

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
      const sums = await bulkUpsertBadgeProgressChunk(chunk, organizationId);
      inserted += sums.inserted;
      updated += sums.updated;
    } catch {
      for (const item of chunk) {
        try {
          const sums = await bulkUpsertBadgeProgressChunk([item], organizationId);
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

type CourseraRawAttachmentDb = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | '$executeRaw'
>;

export type CourseraRawProgressAttachment = {
  courseRowsUpdated: number;
  badgeRowsUpdated: number;
};

/**
 * Lock every identity key touched by a mapping operation. Email locks are
 * global because the serving raw-progress indexes are global. Actor locks are
 * tenant-qualified because actor-only mappings do not touch the raw email
 * tables. Every caller acquires email before actor to avoid lock inversion.
 */
export async function lockCourseraIdentityForAttachment(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
  args: {
    organizationId: string;
    courseraEmail?: string | null;
    actorIdentifier?: string | null;
    actorHomePage?: string | null;
  },
): Promise<void> {
  const organizationId = args.organizationId.trim();
  if (!organizationId) {
    throw new Error('Coursera identity mapping requires an organization id');
  }

  const courseraEmail = args.courseraEmail?.trim().toLowerCase() || null;
  if (courseraEmail) {
    await lockLegacyRawCourseraEmails(db, [courseraEmail]);
  }

  const actorIdentifier = args.actorIdentifier?.trim() || null;
  if (actorIdentifier) {
    const actorHomePage = args.actorHomePage?.trim() || '';
    const actorLockKey = `${organizationId}:coursera-actor:${actorHomePage}:${actorIdentifier}`;
    await db.$queryRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${actorLockKey}, 0))
    `);
  }
}

/**
 * Attach every raw course and badge row for one email inside the caller's
 * transaction. The target user is locked FOR SHARE, so organization/deletion
 * changes cannot race the ownership decision before commit.
 */
export async function attachRawCourseraProgressToUser(
  args: {
    courseraEmail: string;
    userId: string;
    expectedOrganizationId: string;
  },
  db: CourseraRawAttachmentDb,
): Promise<CourseraRawProgressAttachment> {
  const lower = args.courseraEmail.trim().toLowerCase();
  if (!lower) return { courseRowsUpdated: 0, badgeRowsUpdated: 0 };

  const userId = args.userId.trim();
  const targetOrganizationId = args.expectedOrganizationId.trim();
  if (!userId || !targetOrganizationId) {
    throw new Error('Coursera mapping target requires a user and organization');
  }

  await lockLegacyRawCourseraEmails(db, [lower]);

  const targetUsers = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT target_user.id
    FROM users AS target_user
    WHERE target_user.id = ${userId}
      AND target_user.organization_id = ${targetOrganizationId}
      AND target_user.deleted_at IS NULL
    FOR SHARE
  `);
  if (targetUsers.length !== 1) {
    throw new Error('Coursera mapping target must be an active member of the expected organization');
  }

  const conflicts = await db.$queryRaw<Array<{ source: string }>>(Prisma.sql`
      SELECT 'course'::text AS source
      FROM coursera_course_progress AS progress
      LEFT JOIN users AS linked_user ON linked_user.id = progress.user_id
      WHERE LOWER(progress.external_email) = ${lower}
        AND (
          (
            progress.organization_id IS NOT NULL
            AND progress.organization_id <> ${targetOrganizationId}
          )
          OR (
            progress.user_id IS NOT NULL
            AND progress.user_id <> ${userId}
          )
          OR (
            progress.user_id IS NOT NULL
            AND (
              linked_user.id IS NULL
              OR linked_user.organization_id <> ${targetOrganizationId}
              OR linked_user.deleted_at IS NOT NULL
            )
          )
        )
      UNION ALL
      SELECT 'badge'::text AS source
      FROM coursera_badge_progress AS progress
      LEFT JOIN users AS linked_user ON linked_user.id = progress.user_id
      WHERE LOWER(progress.external_email) = ${lower}
        AND (
          (
            progress.organization_id IS NOT NULL
            AND progress.organization_id <> ${targetOrganizationId}
          )
          OR (
            progress.user_id IS NOT NULL
            AND progress.user_id <> ${userId}
          )
          OR (
            progress.user_id IS NOT NULL
            AND (
              linked_user.id IS NULL
              OR linked_user.organization_id <> ${targetOrganizationId}
              OR linked_user.deleted_at IS NOT NULL
            )
          )
        )
      LIMIT 1
  `);
  if (conflicts.length > 0) {
    throw new Error('Coursera raw progress belongs to a different user or organization');
  }

  const courseRowsUpdated = await db.$executeRaw(Prisma.sql`
    UPDATE coursera_course_progress
    SET
      user_id = COALESCE(user_id, ${userId}),
      organization_id = COALESCE(organization_id, ${targetOrganizationId})
    WHERE LOWER(external_email) = ${lower}
      AND (user_id IS NULL OR user_id = ${userId})
      AND (organization_id IS NULL OR organization_id = ${targetOrganizationId})
      AND (user_id IS NULL OR organization_id IS NULL)
  `);

  const badgeRowsUpdated = await db.$executeRaw(Prisma.sql`
    UPDATE coursera_badge_progress
    SET
      user_id = COALESCE(user_id, ${userId}),
      organization_id = COALESCE(organization_id, ${targetOrganizationId})
    WHERE LOWER(external_email) = ${lower}
      AND (user_id IS NULL OR user_id = ${userId})
      AND (organization_id IS NULL OR organization_id = ${targetOrganizationId})
      AND (user_id IS NULL OR organization_id IS NULL)
  `);

  return {
    courseRowsUpdated: Number(courseRowsUpdated) || 0,
    badgeRowsUpdated: Number(badgeRowsUpdated) || 0,
  };
}

/**
 * Transactional retry path used by scoped orphan repair. Route-level mapping
 * flows use mapCourseraIdentityAndProgress so the mapping and attachment share
 * the same transaction.
 */
export async function backfillUserIdForCourseraEmail(
  courseraEmail: string,
  userId: string,
  expectedOrganizationId: string,
): Promise<CourseraRawProgressAttachment> {
  const lower = courseraEmail.trim().toLowerCase();
  if (!lower) return { courseRowsUpdated: 0, badgeRowsUpdated: 0 };

  const result = await prisma.$transaction((tx) =>
    attachRawCourseraProgressToUser(
      { courseraEmail: lower, userId, expectedOrganizationId },
      tx,
    ),
  );

  // Immediately promote the newly-linked rows into course_progress so the
  // member dashboard reflects the historical CSV data without waiting for xAPI.
  await promoteCsvProgressToCanonical({ userId });

  return result;
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
export async function backfillAllOrphanedCourseraProgress(
  organizationId: string,
): Promise<{
  mappingsProcessed: number;
  totalCourseRowsUpdated: number;
  totalBadgeRowsUpdated: number;
  errors: string[];
}> {
  const normalizedOrganizationId = organizationId.trim();
  if (!normalizedOrganizationId) {
    throw new Error('Coursera orphan backfill requires an organization id');
  }

  const mappings = await prisma.$queryRaw<
    Array<{ userId: string; courseraEmail: string; organizationId: string }>
  >`
    SELECT
      mapping.user_id AS "userId",
      mapping.coursera_email AS "courseraEmail",
      target_user.organization_id AS "organizationId"
    FROM coursera_identity_mappings AS mapping
    JOIN users AS target_user
      ON target_user.id = mapping.user_id
      AND target_user.deleted_at IS NULL
    WHERE mapping.coursera_email IS NOT NULL
      AND target_user.organization_id = ${normalizedOrganizationId}
      AND (
        mapping.organization_id IS NULL
        OR mapping.organization_id = ${normalizedOrganizationId}
      )
    ORDER BY mapping.updated_at DESC
  `;

  let totalCourseRowsUpdated = 0;
  let totalBadgeRowsUpdated = 0;
  const errors: string[] = [];

  for (const mapping of mappings) {
    try {
      const result = await backfillUserIdForCourseraEmail(
        mapping.courseraEmail,
        mapping.userId,
        mapping.organizationId,
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
