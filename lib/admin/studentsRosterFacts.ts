import { canonicalizeProgramSlug, programSlugsEquivalent } from '@/lib/content/programSlug';
import {
  resolveTrainingProgressAssignment,
  type TrainingProgressEnrollment,
} from '@/lib/member/trainingProgress';
import type { LocalCourseProgressFact } from '@/lib/coursera/progressReconciliation';

export type StudentRosterAssignmentSource = 'enrollment' | 'legacy' | 'unassigned' | 'unresolved';
export type StudentRosterActivitySource = 'coursera' | 'course_progress' | 'portal_login';
export type StudentRosterCourseFact = LocalCourseProgressFact & { programSlug: string };

/** Learning evidence is not an assignment, even when its aggregate was updated last. */
export function resolveStudentRosterAssignment(args: {
  enrolledProgram: string | null;
  enrollments: readonly TrainingProgressEnrollment[];
  courseFacts: readonly StudentRosterCourseFact[];
}) {
  const assignment = resolveTrainingProgressAssignment(args.enrolledProgram, args.enrollments);
  const programSlug = assignment.programSlug ? canonicalizeProgramSlug(assignment.programSlug) : null;
  const source: StudentRosterAssignmentSource = programSlug
    ? args.enrollments.length > 0 ? 'enrollment' : 'legacy'
    : args.enrollments.length > 0 ? 'unresolved' : 'unassigned';

  return {
    programSlug,
    curriculumVersion: assignment.curriculumVersion,
    source,
    courseFacts: programSlug
      ? args.courseFacts.filter((fact) => programSlugsEquivalent(fact.programSlug, programSlug))
      : [],
  };
}

export const STUDENT_ROSTER_ACTIVITY_LABELS: Record<StudentRosterActivitySource, string> = {
  coursera: 'Coursera learning activity',
  course_progress: 'Course learning activity',
  portal_login: 'WAP sign-in',
};

/** Receipt/update times intentionally have no input: a refresh is not learner activity. */
export function resolveStudentRosterActivity(args: {
  courseraActivityAt?: Date | null;
  courseActivityAt?: Date | null;
  portalLoginAt?: Date | null;
}): { at: Date | null; source: StudentRosterActivitySource | null } {
  const candidates: Array<{ at: Date | null | undefined; source: StudentRosterActivitySource }> = [
    { at: args.courseraActivityAt, source: 'coursera' },
    { at: args.courseActivityAt, source: 'course_progress' },
    { at: args.portalLoginAt, source: 'portal_login' },
  ];
  let latest: { at: Date | null; source: StudentRosterActivitySource | null } = { at: null, source: null };
  for (const candidate of candidates) {
    if (!candidate.at || !Number.isFinite(candidate.at.getTime())) continue;
    if (!latest.at || candidate.at.getTime() > latest.at.getTime()) {
      latest = { at: candidate.at, source: candidate.source };
    }
  }
  return latest;
}
