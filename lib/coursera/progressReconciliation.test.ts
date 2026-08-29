import test from 'node:test';
import assert from 'node:assert/strict';

import type { ProgramCourse } from '@/lib/content/programs';
import { reconcileProgramProgress } from './progressReconciliation';

const courses: ProgramCourse[] = [
  { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
  { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
  { slug: 'course-3', name: 'Course 3', estimatedHours: 10, courseraCourseId: 'id-3' },
  { slug: 'course-4', name: 'Course 4', estimatedHours: 10, courseraCourseId: 'id-4' },
];

test('uses one validated X/Y/percent formula and never completes a 40 percent course', () => {
  const result = reconcileProgramProgress({
    validatedCourses: courses,
    b4bProgress: new Map([
      ['id-1', { overallProgress: 100, isCompleted: true }],
      ['id-2', { overallProgress: 100, isCompleted: true }],
      ['id-3', { overallProgress: 40, isCompleted: false }],
    ]),
    localRows: [],
  });

  assert.equal(result.completedCount, 2);
  assert.equal(result.totalCourses, 4);
  assert.equal(result.programPercent, 60);
  assert.equal(result.allComplete, false);
});

test('labels a Coursera-id local match under the wrong slug instead of silently treating it as zero', () => {
  const result = reconcileProgramProgress({
    validatedCourses: [courses[0]],
    localRows: [
      {
        courseSlug: 'legacy-wrong-slug',
        courseId: 'id-1',
        percentComplete: 75,
        status: 'IN_PROGRESS',
      },
    ],
  });

  assert.equal(result.rows[0]?.displayPercent, 75);
  assert.equal(result.rows[0]?.drift, 'slug_mismatch');
});

test('93 percent stays in progress until an explicit completion fact arrives', () => {
  const result = reconcileProgramProgress({
    validatedCourses: [courses[0]],
    b4bProgress: new Map([
      ['id-1', { overallProgress: 93, isCompleted: false }],
    ]),
    localRows: [],
  });

  assert.equal(result.programPercent, 93);
  assert.equal(result.completedCount, 0);
  assert.equal(result.allComplete, false);
});

test('a completed local fact is never demoted by a lagging B4B row', () => {
  const result = reconcileProgramProgress({
    validatedCourses: [courses[0]],
    b4bProgress: new Map([
      ['id-1', { overallProgress: 93, isCompleted: false }],
    ]),
    localRows: [{
      courseSlug: 'course-1',
      courseId: 'id-1',
      percentComplete: 100,
      status: 'COMPLETED',
    }],
  });

  assert.equal(result.rows[0]?.displayCompleted, true);
  assert.equal(result.rows[0]?.displayPercent, 100);
  assert.equal(result.rows[0]?.drift, 'local_ahead');
});

test('duplicate canonical and alias-program facts merge monotonically before X/Y/%', () => {
  const result = reconcileProgramProgress({
    validatedCourses: [courses[0], courses[1]],
    localRows: [
      {
        courseSlug: 'course-1',
        courseId: 'id-1',
        percentComplete: 100,
        status: 'COMPLETED',
      },
      {
        courseSlug: 'course-1',
        courseId: 'id-1',
        percentComplete: 20,
        status: 'IN_PROGRESS',
      },
    ],
  });

  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCourses, 2);
  assert.equal(result.programPercent, 50);
  assert.equal(result.allComplete, false);
});

test('an exact stale slug row cannot demote a completed row joined by Coursera id', () => {
  const result = reconcileProgramProgress({
    validatedCourses: [courses[0], courses[1]],
    localRows: [
      {
        courseSlug: 'course-1',
        courseId: 'id-1',
        percentComplete: 20,
        status: 'IN_PROGRESS',
      },
      {
        courseSlug: 'legacy-course-1',
        courseId: 'id-1',
        percentComplete: 100,
        status: 'COMPLETED',
      },
    ],
  });

  assert.equal(result.completedCount, 1);
  assert.equal(result.programPercent, 50);
  assert.equal(result.rows[0]?.displayCompleted, true);
});
