import { Prisma } from '@prisma/client';

export type StudentRosterQueryScope = {
  organizationId: string;
  superAdmin: boolean;
  userIds: string[];
};

/** Each lateral lookup is indexed by a user already admitted to the bounded roster. */
export function buildStudentRosterEnrichmentQuery(args: StudentRosterQueryScope): Prisma.Sql {
  const userOrgPredicate = args.superAdmin
    ? Prisma.empty
    : Prisma.sql`AND u.organization_id = ${args.organizationId}`;

  return Prisma.sql`
    SELECT
      u.id AS "userId",
      u.organization_id AS "organizationId",
      u.enrolled_program AS "enrolledProgram",
      COALESCE(enrollment_assignments.assignments, '[]'::jsonb) AS "enrollments",
      COALESCE(local_progress.course_facts, '[]'::jsonb) AS "courseFacts",
      local_progress.last_activity_at AS "courseActivityAt",
      provider_activity.last_activity_time AS "courseraActivityAt",
      (COALESCE(local_progress.progress_count, 0) > 0 OR provider_activity.progress_count > 0) AS "hasLearningEvidence",
      latest_grade.course_grade AS "courseGrade"
    FROM users u
    LEFT JOIN LATERAL (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'programSlug', ce.program_slug,
          'curriculumVersion', ce.curriculum_version,
          'isPrimary', ce.is_primary
        ) ORDER BY ce.is_primary DESC, ce.enrolled_at DESC, ce.id DESC
      ) AS assignments
      FROM course_enrollments ce
      WHERE ce.user_id = u.id
        AND ce.organization_id = u.organization_id
    ) enrollment_assignments ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'programSlug', cp.program_slug,
            'courseSlug', cp.course_slug,
            'courseId', cp.course_id,
            'percentComplete', cp.percent_complete,
            'status', cp.status
          ) ORDER BY cp.last_updated_at DESC
        ) AS course_facts,
        MAX(cp.last_activity_at) AS last_activity_at,
        COUNT(*) AS progress_count
      FROM course_progress cp
      WHERE cp.user_id = u.id
    ) local_progress ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(ccp.last_activity_time) AS last_activity_time, COUNT(*) AS progress_count
      FROM coursera_course_progress ccp
      WHERE ccp.user_id = u.id
        AND ccp.organization_id = u.organization_id
    ) provider_activity ON TRUE
    LEFT JOIN LATERAL (
      SELECT ccp.course_grade
      FROM coursera_course_progress ccp
      WHERE ccp.user_id = u.id
        AND ccp.organization_id = u.organization_id
        -- Select a readable grade independently: a newer blank/pass row must
        -- neither erase an older grade nor suppress the learner's activity.
        AND REPLACE(REPLACE(BTRIM(ccp.course_grade), ',', ''), '%', '')
          ~ '^[+]?([0-9]+([.][0-9]*)?|[.][0-9]+)'
      ORDER BY ccp.last_activity_time DESC NULLS LAST, ccp.last_synced_at DESC, ccp.id DESC
      LIMIT 1
    ) latest_grade ON TRUE
    WHERE u.id = ANY(${args.userIds}::text[])
      ${userOrgPredicate}
  `;
}
