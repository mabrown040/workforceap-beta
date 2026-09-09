import type { Program } from '../data/programs';
import {
  DIGITAL_LITERACY_PROGRAM_SLUG,
  DIGITAL_LITERACY_TOTAL_MINUTES,
} from '../../../shared/digitalLiteracyPathway';

export const CAREER_PLAN_STORAGE_KEY = 'workforceap:career-plan:v1';
export const PLAN_TASK_IDS = ['research', 'questions', 'schedule', 'access', 'practice', 'evidence', 'advisor', 'decision'] as const;
export type PlanTaskId = (typeof PLAN_TASK_IDS)[number];

export interface CareerPlanSnapshot {
  version: 1;
  selectedProgramSlug: string;
  recommendedProgramSlugs: string[];
  weeklyHours: number;
  completedByProgram: Record<string, PlanTaskId[]>;
}

export interface PlanWeek {
  number: number;
  title: string;
  tasks: { id: PlanTaskId; text: string; href?: string; linkLabel?: string }[];
}

export function programApplyHref(slug: string): string {
  return `/apply?program=${encodeURIComponent(slug)}`;
}

export function occupationResearchHref(program: Program): string {
  const occupation = program.extra?.jobOutcomes[0] ?? program.categoryLabel;
  return `https://www.mynextmove.org/find/search?s=${encodeURIComponent(occupation)}`;
}

/** Never derive a completion claim from default course hours or draft curricula. */
export function verifiedProgramHours(program: Program): { hours: number; source: string; lessonTimeOnly: boolean } | null {
  if (program.syllabus?.sourceDocument && /^[a-f0-9]{64}$/i.test(program.syllabus.sourceSha256)) {
    const hours = program.syllabus.totalHours;
    if (Number.isFinite(hours) && hours > 0) {
      return { hours, source: 'Published program syllabus', lessonTimeOnly: false };
    }
  }
  if (program.curriculum?.status === 'owner-verified') {
    const hours = program.curriculum.totalHours;
    if (Number.isFinite(hours) && hours > 0) {
      return { hours, source: 'Owner-verified curriculum', lessonTimeOnly: false };
    }
  }
  if (program.slug === DIGITAL_LITERACY_PROGRAM_SLUG) {
    return { hours: DIGITAL_LITERACY_TOTAL_MINUTES / 60, source: 'Published DigitalLearn lesson sequence', lessonTimeOnly: true };
  }
  return null;
}

export function trainingWeeks(program: Program, weeklyHours: number): number | null {
  const verified = verifiedProgramHours(program);
  if (!verified || !Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 40) return null;
  return Math.ceil(verified.hours / weeklyHours);
}

export function parseCareerPlan(raw: string | null, validSlugs: readonly string[]): CareerPlanSnapshot | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const plan = value as Partial<CareerPlanSnapshot>;
    if (plan.version !== 1 || typeof plan.selectedProgramSlug !== 'string' || !validSlugs.includes(plan.selectedProgramSlug)) return null;
    if (!Array.isArray(plan.recommendedProgramSlugs)) return null;
    const slugs = [...new Set(plan.recommendedProgramSlugs.filter((slug): slug is string => typeof slug === 'string' && validSlugs.includes(slug)))].slice(0, 3);
    if (!slugs.includes(plan.selectedProgramSlug)) return null;
    const weeklyHours = typeof plan.weeklyHours === 'number' && Number.isInteger(plan.weeklyHours) && plan.weeklyHours >= 0 && plan.weeklyHours <= 40
      ? plan.weeklyHours : 5;
    const completedByProgram: Record<string, PlanTaskId[]> = {};
    if (plan.completedByProgram && typeof plan.completedByProgram === 'object' && !Array.isArray(plan.completedByProgram)) {
      for (const slug of validSlugs) {
        const tasks = plan.completedByProgram[slug];
        if (Array.isArray(tasks)) completedByProgram[slug] = [...new Set(tasks.filter((id): id is PlanTaskId => PLAN_TASK_IDS.includes(id)))];
      }
    }
    return { version: 1, selectedProgramSlug: plan.selectedProgramSlug, recommendedProgramSlugs: slugs, weeklyHours, completedByProgram };
  } catch {
    return null;
  }
}

export function readCareerPlan(storage: Pick<Storage, 'getItem'>, validSlugs: readonly string[]): CareerPlanSnapshot | null {
  try { return parseCareerPlan(storage.getItem(CAREER_PLAN_STORAGE_KEY), validSlugs); } catch { return null; }
}

export function saveCareerPlan(storage: Pick<Storage, 'setItem'>, snapshot: CareerPlanSnapshot): boolean {
  try { storage.setItem(CAREER_PLAN_STORAGE_KEY, JSON.stringify(snapshot)); return true; } catch { return false; }
}

export function togglePlanTask(snapshot: CareerPlanSnapshot, taskId: PlanTaskId): CareerPlanSnapshot {
  const current = snapshot.completedByProgram[snapshot.selectedProgramSlug] ?? [];
  return {
    ...snapshot,
    completedByProgram: {
      ...snapshot.completedByProgram,
      [snapshot.selectedProgramSlug]: current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    },
  };
}

export function buildPlanWeeks(program: Program, weeklyHours: number): PlanWeek[] {
  const role = program.extra?.jobOutcomes[0] ?? program.categoryLabel;
  const skill = program.skills[0] ?? 'a skill in this curriculum';
  return [
    { number: 1, title: 'Check the career, not just the title', tasks: [
      { id: 'research', text: `Explore ${role} work. Read the tasks and entry requirements, then compare two current job postings in your area.`, href: occupationResearchHref(program), linkLabel: 'Research this occupation on My Next Move' },
      { id: 'questions', text: `Read the ${program.title} curriculum. Write down one thing that interests you and one question about prerequisites.`, href: `/programs/${program.slug}`, linkLabel: 'Review the program curriculum' },
    ] },
    { number: 2, title: 'Make room for learning', tasks: [
      { id: 'schedule', text: weeklyHours > 0 ? `Try a ${weeklyHours}-hour study week on your calendar. Choose specific days and a backup time around work and family.` : 'Look for one realistic study window. If time is tight, ask an advisor about pacing before committing.' },
      { id: 'access', text: 'Check your computer, internet, and study space. List any accessibility, language, transportation, or caregiving needs to discuss with an advisor.' },
    ] },
    { number: 3, title: 'Try a skill and keep the evidence', tasks: [
      { id: 'practice', text: `Explore an introductory resource on ${skill}. Explain what you learned in your own words; use free resources before paying for anything.` },
      { id: 'evidence', text: 'Save a short work sample or learning note. Write what you tried, what you learned, and what you would practice next. Use sample information, not private data.' },
    ] },
    { number: 4, title: 'Decide with the right support', tasks: [
      { id: 'advisor', text: 'Discuss prerequisites, scholarship or grant eligibility, any uncovered costs, equipment, the actual schedule, and career support with WorkforceAP.', href: '/contact', linkLabel: 'Talk with the WorkforceAP team' },
      { id: 'decision', text: 'Choose your next step: apply for this program, compare another path, or revise your study plan. You can apply earlier if you are ready.', href: programApplyHref(program.slug), linkLabel: 'Apply for this program' },
    ] },
  ];
}

export function careerPlanText(program: Program, snapshot: CareerPlanSnapshot): string {
  const verified = verifiedProgramHours(program);
  const weeks = trainingWeeks(program, snapshot.weeklyHours);
  const completed = snapshot.completedByProgram[program.slug] ?? [];
  return [
    'WORKFORCEAP | MY CAREER ACTION PLAN',
    'workforceap.org · (512) 777-1808',
    '', program.title,
    'Four weeks to explore and prepare. This is not a four-week certification or job placement promise.',
    `My weekly study capacity: ${snapshot.weeklyHours > 0 ? `${snapshot.weeklyHours} hours` : 'Still working it out'}`,
    verified ? `${verified.source}: ${Number(verified.hours.toFixed(1))} ${verified.lessonTimeOnly ? 'lesson' : 'curriculum'} hours.` : 'Verified total training hours are not available for this program. Confirm them with an advisor.',
    weeks ? `Planning estimate: ${weeks} week${weeks === 1 ? '' : 's'} at my chosen pace. Allow additional time for enrollment, practice, scheduling, and exams; confirm the actual schedule with an advisor.` : 'No training completion estimate until hours and study capacity are confirmed.',
    '', ...buildPlanWeeks(program, snapshot.weeklyHours).flatMap((week) => [
      `WEEK ${week.number}: ${week.title}`,
      ...week.tasks.flatMap((task) => [`[${completed.includes(task.id) ? 'x' : ' '}] ${task.text}`, ...(task.href ? [task.href.startsWith('/') ? `https://workforceap.org${task.href}` : task.href] : [])]), '',
    ]),
    `Program: https://workforceap.org/programs/${program.slug}`,
    `Apply: https://workforceap.org${programApplyHref(program.slug)}`,
    'Training is $0 for qualifying members. Eligibility and funding are confirmed by WorkforceAP.',
    'Your plan is saved in this browser only, not in a member account. Share this file only if you choose.',
  ].join('\n');
}
