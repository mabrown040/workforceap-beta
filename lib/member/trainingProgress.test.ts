import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTrainingProgress, JOB_READY_TRAINING_PCT } from './trainingProgress';
import { PROGRAMS } from '@/lib/content/programs';

const sampleProgram = PROGRAMS.find((p) => p.courses.length >= 4);
if (!sampleProgram) throw new Error('test fixture: need a program with at least 4 courses');
const allSlugs = sampleProgram.courses.map((c) => c.slug);

test('computeTrainingProgress: 0% when no enrolled program', () => {
  const r = computeTrainingProgress(null, []);
  assert.equal(r.pct, 0);
  assert.equal(r.completedCount, 0);
  assert.equal(r.totalCourses, 0);
});

test('computeTrainingProgress: 0% when program has no completions', () => {
  const r = computeTrainingProgress(sampleProgram.slug, []);
  assert.equal(r.pct, 0);
  assert.equal(r.totalCourses, sampleProgram.courses.length);
});

test('computeTrainingProgress: 100% when all courses complete', () => {
  const r = computeTrainingProgress(sampleProgram.slug, allSlugs);
  assert.equal(r.pct, 100);
  assert.equal(r.completedCount, sampleProgram.courses.length);
});

test('computeTrainingProgress: stale slugs do not inflate the count', () => {
  const r = computeTrainingProgress(sampleProgram.slug, [
    'definitely-not-a-real-course-slug',
    'another-fake',
    allSlugs[0],
  ]);
  assert.equal(r.completedCount, 1);
  assert.equal(r.totalCourses, sampleProgram.courses.length);
});

test('computeTrainingProgress: half-complete program rounds to ~50%', () => {
  const halfCount = Math.floor(sampleProgram.courses.length / 2);
  const r = computeTrainingProgress(sampleProgram.slug, allSlugs.slice(0, halfCount));
  assert.equal(r.completedCount, halfCount);
  assert.ok(r.pct >= 33 && r.pct <= 60, `pct ${r.pct} should land near 50% for half completion`);
});

test('JOB_READY_TRAINING_PCT is the 70 threshold from the 2026-04-27 dad review', () => {
  assert.equal(JOB_READY_TRAINING_PCT, 70);
});

test('computeTrainingProgress: malformed coursesCompleted is treated as empty', () => {
  const r = computeTrainingProgress(sampleProgram.slug, 'not-an-array' as unknown);
  assert.equal(r.completedCount, 0);
  assert.equal(r.pct, 0);
});
