import { describe, expect, it } from 'vitest';
import { assignedSyllabusBreakdown, buildTrainingSchedule, isValidPlanDate } from '@/lib/member/trainingWorkspace';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

describe('assigned syllabus hours', () => {
  it('shows the source breakdown when the assigned courses actually match it', () => {
    const program = getProgramBySlug('it-support-professional-certificate-ibm')!;
    expect(assignedSyllabusBreakdown(getProgramCoursesForCurriculumVersion(program, 'legacy-v1'), program.syllabus))
      .toBe('102 hours of coursework + 58 hours of labs, projects, and preparation.');
  });
  it('does not attach a newer breakdown to a different legacy curriculum with the same160-hour total', () => {
    const program = getProgramBySlug('data-analytics-professional-certificate-google')!;
    const assigned = getProgramCoursesForCurriculumVersion(program, 'legacy-v1');
    expect(assigned.reduce((sum, course) => sum + course.estimatedHours, 0)).toBe(160);
    expect(program.syllabus?.totalHours).toBe(160);
    expect(assignedSyllabusBreakdown(assigned, program.syllabus)).toBeUndefined();
  });
  it('does not invent a breakdown without a supplied syllabus', () => {
    expect(assignedSyllabusBreakdown([])).toBeUndefined();
  });
});

describe('training schedule estimates', () => {
  it('plans the actual160-hour course weights over16weeks at10hours/week', () => {
    const courses = [12, 16, 18, 12, 12, 12, 9, 3, 8, 58].map((estimatedHours, index) => ({ slug: `course-${index}`, estimatedHours }));
    const schedule = buildTrainingSchedule(courses, 10, '2026-09-09');
    expect(schedule[0]).toEqual({ courseSlug: 'course-0', startWeek: 1, endWeek: 2, targetDate: '2026-09-22' });
    expect(schedule.at(-1)).toEqual({ courseSlug: 'course-9', startWeek: 11, endWeek: 16, targetDate: '2026-12-29' });
  });
  it('does not force a non160-hour assignment into16weeks', () => {
    expect(buildTrainingSchedule([{ slug: 'short', estimatedHours: 30 }], 10, '2026-09-09')[0]?.endWeek).toBe(3);
  });
  it('starts a new course in the next week when the previous fills a week', () => {
    const schedule = buildTrainingSchedule([{ slug: 'one', estimatedHours: 10 }, { slug: 'two', estimatedHours: 10 }], 10, '2026-09-09');
    expect(schedule.map((row) => [row.startWeek, row.endWeek])).toEqual([[1, 1], [2, 2]]);
  });
  it('handles leap-year dates without rollover accepting invalid days', () => {
    expect(isValidPlanDate('2028-02-29')).toBe(true);
    expect(isValidPlanDate('2026-02-29')).toBe(false);
    expect(isValidPlanDate('2026-02-30')).toBe(false);
  });
  it('rejects invalid pacing inputs instead of emitting an invalid timeline', () => {
    expect(buildTrainingSchedule([{ slug: 'one', estimatedHours: 10 }], 0, '2026-09-09')).toEqual([]);
    expect(buildTrainingSchedule([{ slug: 'one', estimatedHours: 10 }], 10, 'invalid')).toEqual([]);
  });
});
