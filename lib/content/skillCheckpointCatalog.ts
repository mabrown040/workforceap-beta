import 'server-only';

import { getCoursesForProgram } from '@/lib/content/courseSkillMap';
import { getProgramBySlug } from '@/lib/content/programs';

export type SkillCheckpointDefinition = {
  key: string;
  programSlug: string;
  programTitle: string;
  title: string;
  milestoneLabel: string;
  requiredCourseSlugs: string[];
  suggestedReviewCourseSlug: string | null;
  skillLabels: string[];
  scenarioPrompt: string;
  evidenceHint: string;
};

type CourseWindow = {
  start: number;
  end: number;
};

function chunkCourseIndexes(total: number): CourseWindow[] {
  if (total <= 0) return [];
  const chunkSize = total <= 4 ? 2 : total <= 8 ? 3 : 4;
  const windows: CourseWindow[] = [];

  for (let start = 0; start < total; start += chunkSize) {
    windows.push({
      start,
      end: Math.min(total - 1, start + chunkSize - 1),
    });
  }

  return windows;
}

function toTitleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueStrings(values: Array<string | null | undefined>, max = 4) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }

  return out;
}

function buildScenarioPrompt(args: {
  programTitle: string;
  milestoneLabel: string;
  skillLabels: string[];
}) {
  const skillLead =
    args.skillLabels.length > 0
      ? args.skillLabels.slice(0, 3).join(', ')
      : 'the core skills from this milestone';

  return `Show how you would use ${skillLead} in a real ${args.programTitle} situation after ${args.milestoneLabel}.`;
}

function buildEvidenceHint(skillLabels: string[]) {
  if (skillLabels.length === 0) {
    return 'Capture what the learner can explain, demonstrate, or troubleshoot without prompting.';
  }
  return `Look for plain-language evidence of ${skillLabels.slice(0, 3).join(', ')}.`;
}

export function getSkillCheckpointDefinitionsForProgram(
  programSlug: string,
): SkillCheckpointDefinition[] {
  const program = getProgramBySlug(programSlug);
  if (!program || program.courses.length === 0) return [];

  const mappedCourses = getCoursesForProgram(programSlug);
  const mappedBySlug = new Map(mappedCourses.map((course) => [course.courseSlug, course]));
  const windows = chunkCourseIndexes(program.courses.length);

  return windows.map((window, index) => {
    const courseSlice = program.courses.slice(window.start, window.end + 1);
    const mappedSlice = courseSlice
      .map((course) => mappedBySlug.get(course.slug))
      .filter((course): course is NonNullable<typeof course> => Boolean(course));

    const skillLabels = uniqueStrings([
      ...mappedSlice.flatMap((course) =>
        course.contributions.flatMap((contribution) => contribution.specificSkills),
      ),
      ...mappedSlice.flatMap((course) => course.softSkills),
      ...mappedSlice.flatMap((course) => course.technologies),
      ...courseSlice.map((course) => toTitleCase(course.slug)),
    ]);

    const milestoneLabel =
      courseSlice.length === 1
        ? courseSlice[0].name
        : `${courseSlice[0].name} to ${courseSlice[courseSlice.length - 1].name}`;

    return {
      key: `${programSlug}:checkpoint:${index + 1}`,
      programSlug,
      programTitle: program.title,
      title:
        skillLabels.length > 0
          ? `Prove ${skillLabels.slice(0, 2).join(' + ')}`
          : `Prove milestone ${index + 1}`,
      milestoneLabel,
      requiredCourseSlugs: courseSlice.map((course) => course.slug),
      suggestedReviewCourseSlug: courseSlice[courseSlice.length - 1]?.slug ?? null,
      skillLabels,
      scenarioPrompt: buildScenarioPrompt({
        programTitle: program.title,
        milestoneLabel,
        skillLabels,
      }),
      evidenceHint: buildEvidenceHint(skillLabels),
    };
  });
}
