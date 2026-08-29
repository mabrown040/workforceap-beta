import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { crossTenantOK } from '@/lib/tenant/withTenantScope';

export type StudentRosterEnrichmentRow = {
  userId: string;
  programSlug: string | null;
  averagePercent: number | null;
  courseGrade: string | null;
  lastActivityTime: Date | null;
};

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

  const loadRows = () => prisma.$queryRaw<StudentRosterEnrichmentRow[]>(Prisma.sql`
    SELECT
      u.id AS "userId",
      mpp.program_slug AS "programSlug",
      mpp.average_percent AS "averagePercent",
      latest_course.course_grade AS "courseGrade",
      latest_course.last_activity_time AS "lastActivityTime"
    FROM users u
    LEFT JOIN member_program_progress mpp
      ON mpp.user_id = u.id
      AND mpp.program_slug = u.enrolled_program
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

  return args.superAdmin ? crossTenantOK(loadRows) : loadRows();
}
