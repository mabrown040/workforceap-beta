import { Prisma } from '@prisma/client';
import { programSlugsEquivalent } from '@/lib/content/programSlug';

/** Match provider evidence to a local course without assuming course_id is an opaque provider ID. */
export const MATCHED_COURSE_PROGRESS = Prisma.sql`
  cp.user_id = ccp.user_id AND (
    cp.course_id = ccp.coursera_course_id
    OR (NULLIF(ccp.coursera_course_slug, '') IS NOT NULL AND cp.course_slug = ccp.coursera_course_slug)
    OR EXISTS (
      SELECT 1 FROM coursera_canonical_course_mappings cm
      WHERE cm.coursera_course_id = ccp.coursera_course_id
        AND cm.canonical_program_slug = cp.program_slug
        AND cm.canonical_course_slug = cp.course_slug
    )
    OR EXISTS (
      SELECT 1 FROM coursera_curriculum_course_mappings cm
      JOIN course_enrollments ce ON ce.user_id = cp.user_id
        AND ce.program_slug = cm.canonical_program_slug
        AND ce.curriculum_version = cm.curriculum_version
        AND ce.organization_id = ccp.organization_id
      WHERE cm.coursera_course_id = ccp.coursera_course_id
        AND cm.canonical_program_slug = cp.program_slug
        AND cm.canonical_course_slug = cp.course_slug
    )
  )
`;

export function diagnosticTenantFilter(organizationId: string | null): Prisma.Sql {
  return organizationId === null ? Prisma.empty : Prisma.sql`
    AND u.organization_id = ${organizationId}
    AND ccp.organization_id = ${organizationId}
  `;
}

/** Alias emails can create multiple raw rows for one learner/course. Compare only the latest stored snapshot. */
export const LATEST_B4B_COURSE_PROGRESS = Prisma.sql`
  SELECT DISTINCT ON (organization_id, user_id, coursera_course_id) *
  FROM coursera_course_progress
  WHERE source = 'b4b_sync' AND user_id IS NOT NULL
  ORDER BY organization_id, user_id, coursera_course_id, last_synced_at DESC, id
`;

/** B4B frequently supplies completion only. A stored zero is not measured zero progress. */
export function buildCompletionDriftQuery(organizationId: string | null): Prisma.Sql {
  return Prisma.sql`
    SELECT ccp.id || '::' || cp.id AS key, u.email, cp.program_slug AS "localProgramSlug",
      ccp.course_name AS "courseName", ccp.is_completed AS "providerCompleted",
      (cp.status = 'COMPLETED') AS "localCompleted",
      ccp.last_activity_time AS "lastActivityTime"
    FROM (${LATEST_B4B_COURSE_PROGRESS}) ccp
    JOIN course_progress cp ON ${MATCHED_COURSE_PROGRESS}
    JOIN users u ON u.id = ccp.user_id
    WHERE ccp.source = 'b4b_sync' AND u.deleted_at IS NULL
      AND ccp.organization_id = u.organization_id
      AND ccp.is_completed <> (cp.status = 'COMPLETED')
      ${diagnosticTenantFilter(organizationId)}
    ORDER BY ccp.last_synced_at DESC, ccp.id, cp.id
    LIMIT 20
  `;
}

export type DiagnosticProgram = { slug: string | null; name: string };

/** A shared course must retain every containing program, regardless of provider order. */
export function buildCourseProgramIndex(
  programs: Array<DiagnosticProgram & { courses: Array<{ slug: string }> }>,
): Map<string, DiagnosticProgram[]> {
  const index = new Map<string, DiagnosticProgram[]>();
  for (const program of programs) {
    for (const course of program.courses) {
      if (!course.slug) continue;
      const memberships = index.get(course.slug) ?? [];
      if (!memberships.some((candidate) => candidate.slug === program.slug && candidate.name === program.name)) {
        memberships.push({ slug: program.slug, name: program.name });
      }
      index.set(course.slug, memberships);
    }
  }
  return index;
}

export function courseMatchesAssignedProgram(
  programs: DiagnosticProgram[],
  assignedPrograms: string[],
): boolean {
  return programs.some((program) =>
    program.slug !== null && assignedPrograms.some((assignment) => programSlugsEquivalent(program.slug!, assignment)),
  );
}

export function deriveCourseraOverviewHealth(input: {
  loaded: boolean;
  unmatchedTotal: number | null;
  attentionStatements: number;
  lastXapiReceivedAt: Date | null;
  now: Date;
}): 'unavailable' | 'attention' | 'idle' | 'healthy' {
  if (!input.loaded || input.unmatchedTotal === null) return 'unavailable';
  if (input.unmatchedTotal > 0 || input.attentionStatements > 0) return 'attention';
  if (!input.lastXapiReceivedAt) return 'idle';
  return input.now.getTime() - input.lastXapiReceivedAt.getTime() > 7 * 24 * 60 * 60 * 1000
    ? 'attention'
    : 'healthy';
}
