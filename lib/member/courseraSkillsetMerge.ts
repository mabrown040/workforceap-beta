import type { Program } from '@/lib/content/programs';

export const COURSERA_TITLE_LOOSE_MIN_LEN = 10;

export function normalizeTitleForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(microsoft|coursera|professional certificate|certificate|course)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type CourseraSkillsetProgressLike = {
  skillsetId: string;
  skillsetName: string;
  progressPercent: number;
};

export function resolveCompletedCourseSlugsFromEnterpriseSkillsets(args: {
  program: Program;
  orderedSkillsetIds: string[];
  elements: CourseraSkillsetProgressLike[];
  skillsetSlugOverrides?: Record<string, string>;
}): {
  courseSlugs: string[];
  unmatchedCompletedSkillsets: Array<{ skillsetId: string; skillsetName: string; progressPercent: number }>;
} {
  const overrides = args.skillsetSlugOverrides ?? {};
  const courseBySlug = new Map(args.program.courses.map((course) => [course.slug, course]));
  const completed: string[] = [];
  const unmatchedCompletedSkillsets: Array<{ skillsetId: string; skillsetName: string; progressPercent: number }> = [];

  for (const element of args.elements) {
    if (element.progressPercent < 100) continue;

    const overrideSlug = overrides[element.skillsetId]?.trim();
    if (overrideSlug && courseBySlug.has(overrideSlug)) {
      completed.push(overrideSlug);
      continue;
    }

    const index = args.orderedSkillsetIds.findIndex((id) => id === element.skillsetId);
    const byIndex = index >= 0 ? args.program.courses[index] : undefined;
    if (byIndex) {
      completed.push(byIndex.slug);
      continue;
    }

    const normalizedSkillsetSlug = normalizeSlug(element.skillsetName);
    const bySlugOrName = args.program.courses.find((course) => {
      return (
        normalizeSlug(course.slug) === normalizedSkillsetSlug ||
        normalizeSlug(course.name) === normalizedSkillsetSlug
      );
    });
    if (bySlugOrName) {
      completed.push(bySlugOrName.slug);
      continue;
    }

    const looseTarget = normalizeTitleForMatch(element.skillsetName);
    const loose = looseTarget.length >= COURSERA_TITLE_LOOSE_MIN_LEN
      ? args.program.courses.find((course) => {
          const candidate = normalizeTitleForMatch(course.name);
          return (
            candidate.length >= COURSERA_TITLE_LOOSE_MIN_LEN &&
            (looseTarget.includes(candidate) || candidate.includes(looseTarget))
          );
        })
      : undefined;
    if (loose) {
      completed.push(loose.slug);
      continue;
    }

    unmatchedCompletedSkillsets.push({
      skillsetId: element.skillsetId,
      skillsetName: element.skillsetName,
      progressPercent: element.progressPercent,
    });
  }

  return {
    courseSlugs: Array.from(new Set(completed)),
    unmatchedCompletedSkillsets,
  };
}

export function mapCompletedSkillsetsToCourseSlugs(args: {
  program: Program;
  orderedSkillsetIds: string[];
  elements: CourseraSkillsetProgressLike[];
  skillsetSlugOverrides?: Record<string, string>;
}): string[] {
  return resolveCompletedCourseSlugsFromEnterpriseSkillsets(args).courseSlugs;
}
