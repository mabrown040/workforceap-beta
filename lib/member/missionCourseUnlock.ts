/**
 * Mission catalog rows use invented slugs (`comptia-a-course-1`). Course
 * progress is stored under syllabus / Coursera slugs
 * (`packt-it-fundamentals-and-hardware-essentials-yqged`). Unlock when
 * either slug, or a title match, is in the completed set.
 */

export type MissionUnlockCourse = {
  slug: string;
  name: string;
};

export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bw\//g, 'with ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolveMissionUnlockSlugs(args: {
  missionCourseSlug: string;
  missionCourseTitle: string;
  programCourses: readonly MissionUnlockCourse[];
}): string[] {
  const slugs = new Set<string>([args.missionCourseSlug]);
  const target = normalizeCourseName(args.missionCourseTitle);
  for (const course of args.programCourses) {
    if (course.slug === args.missionCourseSlug || normalizeCourseName(course.name) === target) {
      slugs.add(course.slug);
    }
  }
  return [...slugs];
}

export function isMissionCourseComplete(
  unlockSlugs: readonly string[],
  completedCourseSlugs: readonly string[],
): boolean {
  if (unlockSlugs.length === 0 || completedCourseSlugs.length === 0) return false;
  const completed = new Set(completedCourseSlugs);
  return unlockSlugs.some((slug) => completed.has(slug));
}
