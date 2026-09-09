import { describe, expect, it } from 'vitest';
import { PROGRAMS, type Program } from '../marketing/src/data/programs';
import {
  CAREER_PLAN_STORAGE_KEY,
  buildPlanWeeks,
  careerPlanText,
  parseCareerPlan,
  programApplyHref,
  readCareerPlan,
  saveCareerPlan,
  togglePlanTask,
  trainingWeeks,
  verifiedProgramHours,
  type CareerPlanSnapshot,
} from '../marketing/src/lib/careerActionPlan';
import { getTopProgramsFromQuiz, mergeQuizShortAnswers, scoreQuiz } from '../marketing/src/components/FindYourPathQuiz';

const bySlug = (slug: string) => PROGRAMS.find((program) => program.slug === slug)!;
const supportProgram = bySlug('it-support-professional-certificate-ibm');
const production = bySlug('certified-production-technician-cpt');
const slugs = PROGRAMS.map((program) => program.slug);
const initial = (): CareerPlanSnapshot => ({
  version: 1, selectedProgramSlug: supportProgram.slug, recommendedProgramSlugs: [supportProgram.slug, production.slug], weeklyHours: 5, completedByProgram: {},
});

describe('career plan pacing uses verified curriculum records', () => {
  it('calculates a pace from sourced hours, including rounding', () => {
    expect(verifiedProgramHours(supportProgram)).toMatchObject({ hours: 160, lessonTimeOnly: false });
    expect(trainingWeeks(supportProgram, 5)).toBe(32);
    expect(trainingWeeks(supportProgram, 15)).toBe(11);
  });

  it('does not turn zero or invalid weekly hours into a completion date', () => {
    for (const hours of [0, -5, Infinity, NaN, 41]) expect(trainingWeeks(supportProgram, hours)).toBeNull();
    expect(buildPlanWeeks(supportProgram, 0)[1].tasks[0].text).toContain('one realistic study window');
  });

  it('never presents draft hours or generic course defaults as verified', () => {
    expect(production.curriculum?.status).toBe('draft-pending-owner-verification');
    expect(verifiedProgramHours(production)).toBeNull();
    expect(trainingWeeks(production, 10)).toBeNull();
    const unsourced: Program = { ...supportProgram, syllabus: undefined, curriculum: undefined };
    expect(verifiedProgramHours(unsourced)).toBeNull();
    expect(verifiedProgramHours({ ...supportProgram, syllabus: { ...supportProgram.syllabus!, sourceSha256: '' } })).toBeNull();
  });

  it('distinguishes recorded digital literacy lessons from full training time', () => {
    const digital = bySlug('digital-literacy-empowerment-class');
    expect(verifiedProgramHours(digital)).toMatchObject({ lessonTimeOnly: true });
    expect(verifiedProgramHours(digital)?.hours).toBeGreaterThan(0);
    expect(verifiedProgramHours(digital)?.hours).toBeLessThan(5);
  });
});

describe('device-only career plan persistence', () => {
  it('round trips a saved plan and keeps study capacity zero', () => {
    const plan = { ...initial(), weeklyHours: 0 };
    const storage = new Map<string, string>();
    expect(saveCareerPlan({ setItem: (key, value) => { storage.set(key, value); } }, plan)).toBe(true);
    expect(storage.has(CAREER_PLAN_STORAGE_KEY)).toBe(true);
    expect(readCareerPlan({ getItem: (key) => storage.get(key) ?? null }, slugs)).toEqual(plan);
  });

  it('recovers from malformed, unsupported, or foreign browser storage', () => {
    for (const raw of [null, 'broken json', 'null', '[]', '{}', JSON.stringify({ ...initial(), version: 2 }), JSON.stringify({ ...initial(), selectedProgramSlug: 'unknown' }), JSON.stringify({ ...initial(), recommendedProgramSlugs: [production.slug] })]) {
      expect(parseCareerPlan(raw, slugs)).toBeNull();
    }
  });

  it('sanitizes invalid task IDs, unknown programs and out-of-range hours', () => {
    const raw = JSON.stringify({ ...initial(), weeklyHours: 1000, recommendedProgramSlugs: [supportProgram.slug, supportProgram.slug, 'unknown'], completedByProgram: { [supportProgram.slug]: ['research', 'research', 'invented', 3], unknown: ['decision'] } });
    expect(parseCareerPlan(raw, slugs)).toEqual({ ...initial(), weeklyHours: 5, recommendedProgramSlugs: [supportProgram.slug], completedByProgram: { [supportProgram.slug]: ['research'] } });
  });

  it('does not crash when storage is unavailable or its quota is exhausted', () => {
    expect(readCareerPlan({ getItem: () => { throw new Error('blocked'); } }, slugs)).toBeNull();
    expect(saveCareerPlan({ setItem: () => { throw new Error('quota'); } }, initial())).toBe(false);
  });

  it('keeps checked work separate when switching programs, and supports undo', () => {
    const first = togglePlanTask(initial(), 'research');
    const switched = { ...first, selectedProgramSlug: production.slug };
    const second = togglePlanTask(switched, 'schedule');
    expect(second.completedByProgram[supportProgram.slug]).toEqual(['research']);
    expect(second.completedByProgram[production.slug]).toEqual(['schedule']);
    expect(togglePlanTask(second, 'schedule').completedByProgram[production.slug]).toEqual([]);
    expect(first.completedByProgram[production.slug]).toBeUndefined();
  });
});

describe('actionable program-specific exports and handoffs', () => {
  it('uses the selected program in the preparation plan and application handoff', () => {
    const selected = { ...initial(), selectedProgramSlug: production.slug };
    const tasks = buildPlanWeeks(production, selected.weeklyHours).flatMap((week) => week.tasks);
    expect(tasks.find((task) => task.id === 'decision')?.href).toBe(`/apply?program=${production.slug}`);
    expect(tasks.find((task) => task.id === 'questions')?.text).toContain(production.title);
    expect(tasks.find((task) => task.id === 'practice')?.text).toContain(production.skills[0]);
    expect(programApplyHref('a&b')).toBe('/apply?program=a%26b');
  });

  it('exports checked state, source limitations, branding, and the correct program', () => {
    const selected = togglePlanTask({ ...initial(), selectedProgramSlug: production.slug }, 'research');
    const output = careerPlanText(production, selected);
    expect(output).toContain('WORKFORCEAP | MY CAREER ACTION PLAN');
    expect(output).toContain('[x] Explore');
    expect(output).toContain('[ ] Read');
    expect(output).toContain('Verified total training hours are not available');
    expect(output).toContain(`https://workforceap.org/apply?program=${production.slug}`);
    expect(output).not.toContain(supportProgram.title);
    expect(output).toContain('not a four-week certification or job placement promise');
  });

  it('exports estimated training separately from the four-week preparation schedule', () => {
    const output = careerPlanText(supportProgram, initial());
    expect(output).toContain('Planning estimate: 32 weeks');
    expect(output).toContain('Published program syllabus: 160');
    expect(output).toContain('WEEK 4:');
    expect(output).not.toMatch(/salary|\$\d+[Kk]/);
  });
});

describe('exploration recommendations respect interest and readiness', () => {
  it('does not redirect a new healthcare learner to IT just for being a beginner', () => {
    const answers = mergeQuizShortAnswers({ q1: 'health', q2: 'brand_new', q3: 'as_fast' });
    const result = getTopProgramsFromQuiz(scoreQuiz(answers), answers);
    expect(result[0].category).toBe('healthcare');
    expect(result).toHaveLength(3);
  });

  it('gives a computer beginner an IT foundation before advanced credentials', () => {
    const answers = mergeQuizShortAnswers({ q1: 'computers', q2: 'brand_new', q3: 'as_fast' });
    const result = getTopProgramsFromQuiz(scoreQuiz(answers), answers);
    expect(result[0].slug).toBe(supportProgram.slug);
    expect(result[1].slug).toBe('comptia-a-professional-certificate');
    expect(result[1].extra?.difficulty).toBeLessThan(3);
    expect(new Set(result.map((program) => program.slug)).size).toBe(3);
  });

  it('keeps manufacturing and trades first for a learner interested in hands-on work', () => {
    const answers = mergeQuizShortAnswers({ q1: 'building', q2: 'brand_new', q3: '3_5_months' });
    expect(getTopProgramsFromQuiz(scoreQuiz(answers), answers).every((program) => program.category === 'manufacturing')).toBe(true);
  });
});
