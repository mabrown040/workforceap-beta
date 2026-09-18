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

export function listWorkforceApModules(args: {
  programSlug: string;
  curriculumVersion: string;
}): ProgramCourse[] {
  const program = getProgramBySlug(args.programSlug);
  if (!program) return [];
  return getProgramCoursesForCurriculumVersion(program, args.curriculumVersion)
    .filter((course) => course.kind === 'workforceap');
}

export function workforceApModuleHref(programSlug: string, courseSlug: string): string {
  return `/dashboard/learning/modules/${encodeURIComponent(courseSlug)}?program=${encodeURIComponent(programSlug)}`;
}

export function getWorkforceApModuleNeighbors(args: {
  programSlug: string;
  curriculumVersion: string;
  courseSlug: string;
}): {
  modules: ProgramCourse[];
  index: number;
  previous: ProgramCourse | null;
  next: ProgramCourse | null;
} {
  const modules = listWorkforceApModules(args);
  const index = modules.findIndex((course) => course.slug === args.courseSlug);
  return {
    modules,
    index,
    previous: index > 0 ? modules[index - 1] ?? null : null,
    next: index >= 0 && index < modules.length - 1 ? modules[index + 1] ?? null : null,
  };
}
