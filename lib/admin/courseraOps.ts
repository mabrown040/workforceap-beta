import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { getProgramBySlug } from '@/lib/content/programs';
import {
  canonicalizeProgramSlug,
  programSlugsEquivalent,
} from '@/lib/content/programSlug';
import { prisma } from '@/lib/db/prisma';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';
import { ensureCourseraMappingTables } from '@/lib/xapi/mappings';

export type XapiStatementAttentionRow = {
  id: string;
  createdAt: Date;
  actorEmail: string | null;
  verb: string;
  courseId: string | null;
  courseName: string | null;
  statementId: string | null;
  processed: boolean;
  reason: 'unprocessed' | 'identity_unmatched';
};

type TenantScopeOptions = {
  organizationId?: string | null;
};

function normalizeOrganizationId(value: string | null | undefined): string | null {
  const normalized = value?.trim() || '';
  return normalized || null;
}

/**
 * Statements that still need operator attention:
 * - `processed === false` (missing external id, pipeline stuck, or not yet finalized)
 * - Rows tied to `coursera_xapi_events` in `unmatched` / `error` (identity or completion failure after ingest)
 */
export async function listXapiStatementsNeedingAttention(
  limit = 100,
  options: TenantScopeOptions = {},
): Promise<XapiStatementAttentionRow[]> {
  await ensureCourseraMappingTables();
  const organizationId = normalizeOrganizationId(options.organizationId);

  return prisma.$queryRaw<XapiStatementAttentionRow[]>`
    SELECT * FROM (
      SELECT
        xs.id,
        xs.created_at AS "createdAt",
        xs.actor_email AS "actorEmail",
        xs.verb,
        xs.course_id AS "courseId",
        xs.course_name AS "courseName",
        xs.statement_id AS "statementId",
        xs.processed,
        'unprocessed'::text AS reason
      FROM xapi_statements xs
      LEFT JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE xs.processed = false
        AND (${organizationId}::text IS NULL OR actor_user.organization_id = ${organizationId}::text)
      UNION
      SELECT
        xs.id,
        xs.created_at AS "createdAt",
        xs.actor_email AS "actorEmail",
        xs.verb,
        xs.course_id AS "courseId",
        xs.course_name AS "courseName",
        xs.statement_id AS "statementId",
        xs.processed,
        'identity_unmatched'::text AS reason
      FROM xapi_statements xs
      INNER JOIN coursera_xapi_events cxe ON cxe.statement_id = xs.statement_id
      LEFT JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE cxe.completion_status IN ('unmatched', 'error')
        AND xs.statement_id IS NOT NULL
        AND (
          ${organizationId}::text IS NULL
          OR cxe.organization_id = ${organizationId}::text
          OR actor_user.organization_id = ${organizationId}::text
        )
    ) u
    ORDER BY u."createdAt" DESC
    LIMIT ${limit}
  `;
}

export async function countXapiStatementsNeedingAttention(
  options: TenantScopeOptions = {},
): Promise<number> {
  await ensureCourseraMappingTables();
  const organizationId = normalizeOrganizationId(options.organizationId);

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT xs.id
      FROM xapi_statements xs
      LEFT JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE xs.processed = false
        AND (${organizationId}::text IS NULL OR actor_user.organization_id = ${organizationId}::text)
      UNION
      SELECT xs.id
      FROM xapi_statements xs
      INNER JOIN coursera_xapi_events cxe ON cxe.statement_id = xs.statement_id
      LEFT JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE cxe.completion_status IN ('unmatched', 'error')
        AND xs.statement_id IS NOT NULL
        AND (
          ${organizationId}::text IS NULL
          OR cxe.organization_id = ${organizationId}::text
          OR actor_user.organization_id = ${organizationId}::text
        )
    ) t
  `;
  return Number(rows[0]?.count ?? 0);
}

export type CourseraSyncStatus = {
  lastXapiReceivedAt: Date | null;
  distinctMembersWithCourseProgress: number;
  attentionStatementCount: number;
};

export async function getCourseraSyncStatus(
  options: TenantScopeOptions = {},
): Promise<CourseraSyncStatus> {
  const organizationId = normalizeOrganizationId(options.organizationId);
  const [maxCreatedRows, progressUsers, attentionCount] = await Promise.all([
    prisma.$queryRaw<Array<{ latest: Date | null }>>`
      SELECT MAX(xs.created_at) AS latest
      FROM xapi_statements xs
      LEFT JOIN coursera_xapi_events cxe ON cxe.statement_id = xs.statement_id
      LEFT JOIN users actor_user ON LOWER(actor_user.email) = LOWER(xs.actor_email)
      WHERE (
        ${organizationId}::text IS NULL
        OR cxe.organization_id = ${organizationId}::text
        OR actor_user.organization_id = ${organizationId}::text
      )
    `,
    prisma.courseProgress.groupBy({
      by: ['userId'],
      ...(organizationId ? { where: { user: { organizationId } } } : {}),
      orderBy: { userId: 'asc' },
      _count: { userId: true },
    }),
    countXapiStatementsNeedingAttention({ organizationId }),
  ]);

  return {
    lastXapiReceivedAt: maxCreatedRows[0]?.latest ?? null,
    distinctMembersWithCourseProgress: progressUsers.length,
    attentionStatementCount: attentionCount,
  };
}

export type CourseProgressAuditRow = {
  id: string;
  programSlug: string;
  courseSlug: string;
  courseId: string | null;
  status: CourseProgressStatus;
  percentComplete: number;
  lastUpdatedAt: Date;
};

export type ProgramProgressAuditRollup = {
  programSlug: string;
  programTitle: string | null;
  curriculumVersion: string;
  catalogCourseCount: number;
  coursesCompleted: number;
  averagePercent: number;
  fromMemberProgramProgress: boolean;
};

export type MemberProgressAuditResult =
  | { found: false }
  | {
      found: true;
      userId: string;
      email: string;
      fullName: string;
      enrolledProgram: string | null;
      courseRows: CourseProgressAuditRow[];
      rollups: ProgramProgressAuditRollup[];
    };

function rollupFromCourseRows(
  programSlug: string,
  curriculumVersion: string,
  rows: CourseProgressAuditRow[]
): Omit<ProgramProgressAuditRollup, 'programSlug' | 'programTitle' | 'fromMemberProgramProgress'> {
  const program = getProgramBySlug(programSlug);
  const assignedCourses = program
    ? getProgramCoursesForCurriculumVersion(program, curriculumVersion)
    : [];
  const assignedCourseSlugs = new Set(assignedCourses.map((course) => course.slug));
  const totalCourses = assignedCourses.length;
  const inProgram = rows.filter((r) =>
    programSlugsEquivalent(r.programSlug, programSlug)
    && assignedCourseSlugs.has(r.courseSlug),
  );
  const completed = inProgram.filter((r) => r.status === CourseProgressStatus.COMPLETED).length;
  const sumPercent = inProgram.reduce((acc, r) => acc + r.percentComplete, 0);
  const averagePercent = totalCourses > 0 ? Math.round(sumPercent / totalCourses) : 0;
  return {
    curriculumVersion,
    catalogCourseCount: totalCourses,
    coursesCompleted: completed,
    averagePercent,
  };
}

export async function loadMemberProgressAuditByEmail(
  email: string,
  options: {
    /**
     * Org admins must supply their tenant. `null` is an explicit platform
     * super-admin support scope; callers may not accidentally omit the
     * tenant filter.
     */
    organizationId: string | null;
  },
): Promise<MemberProgressAuditResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { found: false };

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      email: { equals: normalized, mode: 'insensitive' },
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      enrolledProgram: true,
      courseEnrollments: {
        select: {
          programSlug: true,
          curriculumVersion: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!user) return { found: false };

  const [courseRowsRaw, storedRollups] = await Promise.all([
    prisma.courseProgress.findMany({
      take: 500,
      where: { userId: user.id },
      orderBy: [{ programSlug: 'asc' }, { courseSlug: 'asc' }],
      select: {
        id: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        lastUpdatedAt: true,
      },
    }),
    prisma.memberProgramProgress.findMany({
      take: 500,
      where: { userId: user.id },
      orderBy: { programSlug: 'asc' },
      select: {
        programSlug: true,
        coursesCompleted: true,
        averagePercent: true,
        lastUpdatedAt: true,
      },
    }),
  ]);

  const courseRows: CourseProgressAuditRow[] = courseRowsRaw.map((r) => ({
    id: r.id,
    programSlug: r.programSlug,
    courseSlug: r.courseSlug,
    courseId: r.courseId,
    status: r.status,
    percentComplete: r.percentComplete,
    lastUpdatedAt: r.lastUpdatedAt,
  }));

  const programSlugs = new Set<string>();
  for (const r of courseRows) programSlugs.add(canonicalizeProgramSlug(r.programSlug));
  for (const r of storedRollups) programSlugs.add(canonicalizeProgramSlug(r.programSlug));

  const rollups: ProgramProgressAuditRollup[] = [...programSlugs].sort().map((programSlug) => {
    const program = getProgramBySlug(programSlug);
    const enrollment = user.courseEnrollments
      .filter((row) => programSlugsEquivalent(row.programSlug, programSlug))
      .sort((a, b) => {
        const primaryPreference = Number(b.isPrimary) - Number(a.isPrimary);
        if (primaryPreference !== 0) return primaryPreference;
        return Number(b.programSlug === programSlug) - Number(a.programSlug === programSlug);
      })[0] ?? null;
    // Users predating CourseEnrollment remain explicitly pinned to legacy-v1;
    // the audit must never infer an approved curriculum from progress counts.
    const curriculumVersion = enrollment?.curriculumVersion ?? 'legacy-v1';
    const stored = storedRollups
      .filter((row) => programSlugsEquivalent(row.programSlug, programSlug))
      .sort((a, b) => {
        const canonicalPreference = Number(b.programSlug === programSlug)
          - Number(a.programSlug === programSlug);
        if (canonicalPreference !== 0) return canonicalPreference;
        return b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime();
      })[0];
    const computed = rollupFromCourseRows(programSlug, curriculumVersion, courseRows);
    if (stored) {
      return {
        programSlug,
        programTitle: program?.title ?? programSlug,
        curriculumVersion,
        catalogCourseCount: computed.catalogCourseCount,
        coursesCompleted: stored.coursesCompleted,
        averagePercent: stored.averagePercent,
        fromMemberProgramProgress: true,
      };
    }
    return {
      programSlug,
      programTitle: program?.title ?? programSlug,
      curriculumVersion,
      catalogCourseCount: computed.catalogCourseCount,
      coursesCompleted: computed.coursesCompleted,
      averagePercent: computed.averagePercent,
      fromMemberProgramProgress: false,
    };
  });

  return {
    found: true,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    enrolledProgram: user.enrolledProgram,
    courseRows,
    rollups,
  };
}
