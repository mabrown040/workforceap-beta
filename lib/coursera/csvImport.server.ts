import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { ensureCourseraMappingTables } from '@/lib/xapi/mappings';

import type { IngestResult, ParsedCourseActivityRow } from './csvImport';

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

  return { inserted, updated, resolvedToUsers, unresolved, errors, unresolvedRows };
}
