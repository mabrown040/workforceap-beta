import type { ProgramCourse } from '@/lib/content/programs';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

/** Resolve only a WorkforceAP-authored course inside the learner's pinned curriculum. */
export function resolveWorkforceApModule(args: {
  programSlug: string;
  curriculumVersion: string;
  courseSlug: string;
}): ProgramCourse | null {
  const program = getProgramBySlug(args.programSlug);
  if (!program) return null;
  const course = getProgramCoursesForCurriculumVersion(
    program,
    args.curriculumVersion,
  ).find((candidate) => candidate.slug === args.courseSlug);
  return course?.kind === 'workforceap' ? course : null;
}
