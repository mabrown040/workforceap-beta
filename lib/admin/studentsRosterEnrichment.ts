import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  PROGRAM_SLUG_ALIASES,
  canonicalizeProgramSlug,
  programSlugReadCandidates,
} from '@/lib/content/programSlug';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadValidatedProgramCourses } from '@/lib/coursera/programCourseList';
import { reconcileProgramProgress } from '@/lib/coursera/progressReconciliation';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';
import { crossTenantOK } from '@/lib/tenant/withTenantScope';

export type StudentRosterEnrichmentRow = {
  userId: string;
  programSlug: string | null;
  averagePercent: number | null;
  courseGrade: string | null;
  lastActivityTime: Date | null;
};

type RawStudentRosterEnrichmentRow = StudentRosterEnrichmentRow & {
  organizationId: string;
  curriculumVersion: string;
  courseFacts: unknown;
};

type SqlCourseFact = {
  courseSlug: string;
  courseId: string | null;
  percentComplete: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
};

const CANONICAL_READ_GROUPS = Array.from(
  new Set(Object.values(PROGRAM_SLUG_ALIASES)),
).map((canonical) => ({
  canonical,
  candidates: programSlugReadCandidates(canonical),
}));

function canonicalProgramSlugSql(column: Prisma.Sql): Prisma.Sql {
  const aliasBranches = CANONICAL_READ_GROUPS.map(({ canonical, candidates }) =>
    Prisma.sql`WHEN LOWER(BTRIM(${column})) IN (${Prisma.join(candidates)}) THEN ${canonical}`,
  );
  return Prisma.sql`
    CASE
      ${Prisma.join(aliasBranches, ' ')}
      ELSE LOWER(BTRIM(${column}))
    END
  `;
}

function parseCourseFacts(value: unknown): SqlCourseFact[] {
  if (!Array.isArray(value)) return [];
  return value.filter((fact): fact is SqlCourseFact => {
    if (!fact || typeof fact !== 'object') return false;
    const row = fact as Partial<SqlCourseFact>;
    return (
      typeof row.courseSlug === 'string' &&
      (row.courseId == null || typeof row.courseId === 'string') &&
      typeof row.percentComplete === 'number' &&
      (row.status === 'NOT_STARTED' || row.status === 'IN_PROGRESS' || row.status === 'COMPLETED')
    );
  });
}

/**
 * Load one bounded enrichment row for each member already admitted to the
 * admin roster. The current-program join is unique on (user, program), and the
 * lateral Coursera lookup returns only the member's latest course row.
 *
 * Org admins are filtered again in SQL. Super-admins intentionally retain the
 * cross-tenant support view established by `withAdminPageScope`.
 */
export async function loadStudentRosterEnrichment(args: {
  organizationId: string;
  superAdmin: boolean;
  userIds: string[];
}): Promise<StudentRosterEnrichmentRow[]> {
  if (args.userIds.length === 0) return [];

  const userOrgPredicate = args.superAdmin
    ? Prisma.empty
    : Prisma.sql`AND u.organization_id = ${args.organizationId}`;
  const courseOrgPredicate = args.superAdmin
    ? Prisma.empty
    : Prisma.sql`AND ccp.organization_id = ${args.organizationId}`;

  const canonicalCandidateProgram = canonicalProgramSlugSql(Prisma.sql`candidate.program_slug`);
  const canonicalEnrolledProgram = canonicalProgramSlugSql(Prisma.sql`u.enrolled_program`);
  const canonicalProgressProgram = canonicalProgramSlugSql(Prisma.sql`progress_program.program_slug`);
  const canonicalCourseProgram = canonicalProgramSlugSql(Prisma.sql`cp.program_slug`);
  const canonicalEnrollmentProgram = canonicalProgramSlugSql(Prisma.sql`ce.program_slug`);

  const loadRows = () => prisma.$queryRaw<RawStudentRosterEnrichmentRow[]>(Prisma.sql`
    SELECT
      u.id AS "userId",
      u.organization_id AS "organizationId",
      progress_program.program_slug AS "programSlug",
      COALESCE(enrollment_assignment.curriculum_version, 'legacy-v1') AS "curriculumVersion",
      NULL::integer AS "averagePercent",
      COALESCE(local_progress.course_facts, '[]'::jsonb) AS "courseFacts",
      latest_course.course_grade AS "courseGrade",
      latest_course.last_activity_time AS "lastActivityTime"
    FROM users u
    LEFT JOIN LATERAL (
      SELECT
        candidate.program_slug
      FROM (
        SELECT mpp.program_slug, mpp.last_updated_at AS activity_at
        FROM member_program_progress mpp
        WHERE mpp.user_id = u.id
        UNION ALL
        SELECT
          cp.program_slug,
          MAX(COALESCE(cp.last_activity_at, cp.last_updated_at)) AS activity_at
        FROM course_progress cp
        WHERE cp.user_id = u.id
        GROUP BY cp.program_slug
      ) candidate
      WHERE (
        u.enrolled_program IS NULL
        OR ${canonicalCandidateProgram} = ${canonicalEnrolledProgram}
      )
      ORDER BY
        CASE WHEN ${canonicalCandidateProgram} = ${canonicalEnrolledProgram} THEN 0 ELSE 1 END,
        candidate.activity_at DESC
      LIMIT 1
    ) progress_program ON TRUE
    LEFT JOIN LATERAL (
      SELECT ce.curriculum_version
      FROM course_enrollments ce
      WHERE ce.user_id = u.id
        AND progress_program.program_slug IS NOT NULL
        AND ${canonicalEnrollmentProgram} = ${canonicalProgressProgram}
      ORDER BY ce.is_primary DESC, ce.enrolled_at DESC, ce.id DESC
      LIMIT 1
    ) enrollment_assignment ON TRUE
    LEFT JOIN LATERAL (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'courseSlug', cp.course_slug,
          'courseId', cp.course_id,
          'percentComplete', cp.percent_complete,
          'status', cp.status
        )
        ORDER BY cp.last_updated_at DESC
      ) AS course_facts
      FROM course_progress cp
      WHERE cp.user_id = u.id
        AND progress_program.program_slug IS NOT NULL
        AND ${canonicalCourseProgram} = ${canonicalProgressProgram}
    ) local_progress ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        ccp.course_grade,
        ccp.last_activity_time
      FROM coursera_course_progress ccp
      WHERE ccp.user_id = u.id
        ${courseOrgPredicate}
        -- Preserve the old page semantics: use the newest grade that the UI
        -- parser can interpret, rather than letting a newer blank/pass row
        -- hide an older numeric grade.
        AND REPLACE(REPLACE(BTRIM(ccp.course_grade), ',', ''), '%', '')
          ~ '^[+]?([0-9]+([.][0-9]*)?|[.][0-9]+)'
      ORDER BY
        ccp.last_activity_time DESC NULLS LAST,
        ccp.last_synced_at DESC,
        ccp.id DESC
      LIMIT 1
    ) latest_course ON TRUE
    WHERE u.id = ANY(${args.userIds}::text[])
      ${userOrgPredicate}
  `);

  const rawRows = await (args.superAdmin ? crossTenantOK(loadRows) : loadRows());
  const validatedLists = new Map<string, Awaited<ReturnType<typeof loadValidatedProgramCourses>>['courses']>();

  return Promise.all(rawRows.map(async (row): Promise<StudentRosterEnrichmentRow> => {
    const canonicalProgramSlug = row.programSlug
      ? canonicalizeProgramSlug(row.programSlug)
      : null;
    const program = canonicalProgramSlug ? getProgramBySlug(canonicalProgramSlug) : undefined;
    if (!canonicalProgramSlug || !program) {
      return {
        userId: row.userId,
        programSlug: canonicalProgramSlug,
        averagePercent: null,
        courseGrade: row.courseGrade,
        lastActivityTime: row.lastActivityTime,
      };
    }

    const curriculumVersion = row.curriculumVersion || 'legacy-v1';
    const cacheKey = `${row.organizationId}:${canonicalProgramSlug}:${curriculumVersion}`;
    let validatedCourses = validatedLists.get(cacheKey);
    if (!validatedCourses) {
      try {
        validatedCourses = (await loadValidatedProgramCourses({
          organizationId: row.organizationId,
          programSlug: canonicalProgramSlug,
          curriculumVersion,
          checkB4BContents: false,
        })).courses;
      } catch (error) {
        console.warn(
          '[admin/studentsRosterEnrichment] validated list unavailable; using board catalog:',
          error instanceof Error ? error.message : 'unknown catalog error',
        );
        validatedCourses = getProgramCoursesForCurriculumVersion(
          program,
          curriculumVersion,
        );
      }
      validatedLists.set(cacheKey, validatedCourses);
    }

    const reconciliation = reconcileProgramProgress({
      validatedCourses,
      localRows: parseCourseFacts(row.courseFacts),
    });
    return {
      userId: row.userId,
      programSlug: canonicalProgramSlug,
      averagePercent: reconciliation.programPercent,
      courseGrade: row.courseGrade,
      lastActivityTime: row.lastActivityTime,
    };
  }));
}
