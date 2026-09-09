import { z } from 'zod';
import type { ProgramCourse } from '@/lib/content/programs';

export const TRAINING_WORKSPACE_MAX_NOTES = 10000;
export const TRAINING_WORKSPACE_MAX_URL = 2000;

export function isValidPlanDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const trainingProgramSlugSchema = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const curriculumVersionSchema = z.string().trim().min(1).max(80);
const planDateSchema = z.string().refine(isValidPlanDate, 'Choose a valid date in YYYY-MM-DD format.');
const artifactUrlSchema = z.string().trim().max(TRAINING_WORKSPACE_MAX_URL).url().refine((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'Use an http or https link without embedded credentials.').nullable();

export const trainingWorkspaceUpdateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('plan'),
    programSlug: trainingProgramSlugSchema,
    curriculumVersion: curriculumVersionSchema,
    weeklyHours: z.number().int().min(1).max(40),
    planStartDate: planDateSchema,
  }).strict(),
  z.object({
    kind: z.literal('coursework'),
    programSlug: trainingProgramSlugSchema,
    curriculumVersion: curriculumVersionSchema,
    courseSlug: trainingProgramSlugSchema,
    notes: z.string().max(TRAINING_WORKSPACE_MAX_NOTES),
    artifactUrl: artifactUrlSchema,
  }).strict(),
]);

export type TrainingWorkspaceUpdate = z.infer<typeof trainingWorkspaceUpdateSchema>;
export type TrainingWorkspaceCourse = ProgramCourse & {
  notes: string;
  artifactUrl: string | null;
  updatedAt: string | null;
};

export type TrainingWorkspace = {
  programSlug: string;
  programTitle: string;
  curriculumVersion: string;
  weeklyHours: number | null;
  planStartDate: string | null;
  planUpdatedAt: string | null;
  totalEstimatedHours: number;
  publishedSyllabusHours: number | null;
  courses: TrainingWorkspaceCourse[];
};

export type TrainingCourseSchedule = {
  courseSlug: string;
  startWeek: number;
  endWeek: number;
  targetDate: string;
};

/** Planning estimates only. Never use scheduled hours as attended hours or completion credit. */
export function buildTrainingSchedule(
  courses: readonly Pick<ProgramCourse, 'slug' | 'estimatedHours'>[],
  weeklyHours: number,
  planStartDate: string,
): TrainingCourseSchedule[] {
  if (!Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 40 || !isValidPlanDate(planStartDate)) return [];
  const start = new Date(`${planStartDate}T00:00:00.000Z`);
  let cumulativeHours = 0;
  return courses.map((course) => {
    const startWeek = Math.floor(cumulativeHours / weeklyHours) + 1;
    cumulativeHours += Number.isFinite(course.estimatedHours) ? Math.max(0, course.estimatedHours) : 0;
    const endWeek = Math.max(startWeek, Math.ceil(cumulativeHours / weeklyHours));
    const target = new Date(start);
    target.setUTCDate(target.getUTCDate() + endWeek * 7 - 1);
    return { courseSlug: course.slug, startWeek, endWeek, targetDate: target.toISOString().split('T')[0]! };
  });
}
