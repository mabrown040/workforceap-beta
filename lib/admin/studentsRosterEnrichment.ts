import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { loadValidatedProgramCourses } from '@/lib/coursera/programCourseList';
import { reconcileProgramProgress } from '@/lib/coursera/progressReconciliation';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';
import type { TrainingProgressEnrollment } from '@/lib/member/trainingProgress';
import { crossTenantOK } from '@/lib/tenant/withTenantScope';
import { buildStudentRosterEnrichmentQuery, type StudentRosterQueryScope } from './studentsRosterEnrichmentQuery';
import {
  resolveStudentRosterAssignment,
  type StudentRosterAssignmentSource,
  type StudentRosterCourseFact,
} from './studentsRosterFacts';

export type StudentRosterEnrichmentRow = {
  userId: string;
  programSlug: string | null;
  assignmentSource: StudentRosterAssignmentSource;
  averagePercent: number | null;
  courseGrade: string | null;
  courseraActivityAt: Date | null;
  courseActivityAt: Date | null;
  hasLearningEvidence: boolean;
};

type RawStudentRosterEnrichmentRow = {
  userId: string;
  organizationId: string;
  enrolledProgram: string | null;
  enrollments: TrainingProgressEnrollment[];
  courseFacts: StudentRosterCourseFact[];
  courseGrade: string | null;
  courseraActivityAt: Date | null;
  courseActivityAt: Date | null;
  hasLearningEvidence: boolean;
};

/**
 * One query for the bounded admin roster. Assignment is resolved from durable
 * enrollment candidates before any course facts are admitted to its progress.
 * Org admins are filtered again in SQL; super-admins retain the authorized
 * cross-tenant view, with each learner's raw evidence scoped to their own org.
 */
export async function loadStudentRosterEnrichment(
  args: StudentRosterQueryScope,
): Promise<StudentRosterEnrichmentRow[]> {
  if (args.userIds.length === 0) return [];

  const loadRows = () => prisma.$queryRaw<RawStudentRosterEnrichmentRow[]>(buildStudentRosterEnrichmentQuery(args));
  const rawRows = await (args.superAdmin ? crossTenantOK(loadRows) : loadRows());
  const validatedLists = new Map<string, Promise<Awaited<ReturnType<typeof loadValidatedProgramCourses>>['courses']>>();

  return Promise.all(rawRows.map(async (row): Promise<StudentRosterEnrichmentRow> => {
    const assignment = resolveStudentRosterAssignment({
      enrolledProgram: row.enrolledProgram,
      enrollments: row.enrollments,
      courseFacts: row.courseFacts,
    });
    const result: StudentRosterEnrichmentRow = {
      userId: row.userId,
      programSlug: assignment.programSlug,
      assignmentSource: assignment.source,
      averagePercent: null,
      courseGrade: row.courseGrade,
      courseraActivityAt: row.courseraActivityAt,
      courseActivityAt: row.courseActivityAt,
      hasLearningEvidence: row.hasLearningEvidence,
    };
    const { programSlug, curriculumVersion } = assignment;
    const program = programSlug ? getProgramBySlug(programSlug) : undefined;
    if (!programSlug || !program || !curriculumVersion) return result;

    const cacheKey = `${row.organizationId}:${programSlug}:${curriculumVersion}`;
    let validatedCourses = validatedLists.get(cacheKey);
    if (!validatedCourses) {
      validatedCourses = loadValidatedProgramCourses({
        organizationId: row.organizationId,
        programSlug,
        curriculumVersion,
        checkB4BContents: false,
      }).then((list) => list.courses).catch((error: unknown) => {
        console.warn(
          '[admin/studentsRosterEnrichment] validated list unavailable; using board catalog:',
          error instanceof Error ? error.message : 'unknown catalog error',
        );
        return getProgramCoursesForCurriculumVersion(program, curriculumVersion);
      });
      validatedLists.set(cacheKey, validatedCourses);
    }

    const reconciliation = reconcileProgramProgress({
      validatedCourses: await validatedCourses,
      localRows: assignment.courseFacts,
    });
    return { ...result, averagePercent: reconciliation.programPercent };
  }));
}
