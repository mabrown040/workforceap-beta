import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTrainingProgress,
  JOB_READY_TRAINING_PCT,
  resolveTrainingProgressAssignment,
  resolveTrainingProgressCurriculumVersion,
} from './trainingProgress';
import { PROGRAMS } from '../content/programs';
import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '../content/programCurriculumManifest';
import { getProgramCoursesForCurriculumVersion } from './curriculumAssignment';

const sampleProgram = PROGRAMS.find((p) => p.courses.length >= 4);
if (!sampleProgram) throw new Error('test fixture: need a program with at least 4 courses');
const allSlugs = sampleProgram.courses.map((c) => c.slug);

test('computeTrainingProgress: 0% when no enrolled program', () => {
  const r = computeTrainingProgress({
    enrolledProgram: null,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
  });
  assert.equal(r.pct, 0);
  assert.equal(r.completedCount, 0);
  assert.equal(r.totalCourses, 0);
});

test('computeTrainingProgress: 0% when program has no completions', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
  });
  assert.equal(r.pct, 0);
  assert.equal(r.totalCourses, sampleProgram.courses.length);
});

test('computeTrainingProgress: 100% when all courses complete', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: allSlugs,
  });
  assert.equal(r.pct, 100);
  assert.equal(r.completedCount, sampleProgram.courses.length);
});

test('computeTrainingProgress: stale slugs do not inflate the count', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [
      'definitely-not-a-real-course-slug',
      'another-fake',
      allSlugs[0],
    ],
  });
  assert.equal(r.completedCount, 1);
  assert.equal(r.totalCourses, sampleProgram.courses.length);
});

test('computeTrainingProgress: half-complete program rounds to ~50%', () => {
  const halfCount = Math.floor(sampleProgram.courses.length / 2);
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: allSlugs.slice(0, halfCount),
  });
  assert.equal(r.completedCount, halfCount);
  assert.ok(r.pct >= 33 && r.pct <= 60, `pct ${r.pct} should land near 50% for half completion`);
});

test('JOB_READY_TRAINING_PCT is the 70 threshold from the 2026-04-27 dad review', () => {
  assert.equal(JOB_READY_TRAINING_PCT, 70);
});

test('computeTrainingProgress: malformed coursesCompleted is treated as empty', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: 'not-an-array' as unknown,
  });
  assert.equal(r.completedCount, 0);
  assert.equal(r.pct, 0);
});

test('computeTrainingProgress: live rollup wins over stale legacy JSON', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: sampleProgram.slug,
      coursesCompleted: 2,
      averagePercent: 50,
    },
  });

  assert.equal(r.completedCount, 2);
  assert.equal(r.pct, 50);
});

test('computeTrainingProgress: one of many cannot inherit a stale 100 percent rollup', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: sampleProgram.slug,
      coursesCompleted: 1,
      averagePercent: 100,
    },
  });

  assert.equal(r.completedCount, 1);
  assert.equal(r.pct, Math.round((1 / sampleProgram.courses.length) * 100));
  assert.equal(r.allComplete, false);
});

test('computeTrainingProgress: 93 percent remains in progress without explicit all-course completion', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: sampleProgram.slug,
      coursesCompleted: sampleProgram.courses.length - 1,
      averagePercent: 93,
    },
  });

  assert.equal(r.pct, 93);
  assert.equal(r.allComplete, false);
});

test('computeTrainingProgress: overcounted rollup stays display-clamped without completing', () => {
  const r = computeTrainingProgress({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: sampleProgram.slug,
      coursesCompleted: sampleProgram.courses.length + 1,
      averagePercent: 100,
    },
  });

  assert.equal(r.completedCount, sampleProgram.courses.length);
  assert.equal(r.allComplete, false);
});

test('computeTrainingProgress: approved Management curriculum completes at exactly 11 of 11', () => {
  const program = PROGRAMS.find(
    (candidate) => candidate.slug === 'data-analytics-professional-certificate-google',
  );
  assert.ok(program);
  const approvedCourses = getProgramCoursesForCurriculumVersion(
    program,
    APPROVED_CURRICULUM_VERSION,
  );
  assert.equal(approvedCourses.length, 11);

  const approved = computeTrainingProgress({
    enrolledProgram: program.slug,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: program.slug,
      coursesCompleted: 11,
      averagePercent: 100,
    },
  });
  const legacy = computeTrainingProgress({
    enrolledProgram: program.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: program.slug,
      coursesCompleted: 11,
      averagePercent: 100,
    },
  });

  assert.deepEqual(approved, {
    totalCourses: 11,
    completedCount: 11,
    pct: 100,
    allComplete: true,
  });
  assert.equal(legacy.totalCourses, 13);
  assert.equal(legacy.allComplete, false);
});

test('resolveTrainingProgressAssignment prefers the immutable primary enrollment', () => {
  assert.deepEqual(
    resolveTrainingProgressAssignment(
      'data-analytics-professional-certificate-google',
      [
        {
          programSlug: 'comptia-a-professional-certificate',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          isPrimary: true,
        },
        {
          programSlug: 'data-analytics-professional-certificate-google',
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
          isPrimary: false,
        },
      ],
    ),
    {
      programSlug: 'comptia-a-professional-certificate',
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
    },
  );
});

test('resolveTrainingProgressAssignment matches an unmarked legacy alias', () => {
  assert.deepEqual(
    resolveTrainingProgressAssignment(
      'data-analytics-professional-certificate-google',
      [
        {
          programSlug: 'management-and-data-analyst-professional-certificate-google-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          isPrimary: false,
        },
      ],
    ),
    {
      programSlug: 'management-and-data-analyst-professional-certificate-google-ibm',
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
    },
  );
});

test('training assignment defaults to legacy only when no enrollment exists', () => {
  assert.deepEqual(
    resolveTrainingProgressAssignment(
      'data-analytics-professional-certificate-google',
      [],
    ),
    {
      programSlug: 'data-analytics-professional-certificate-google',
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
    },
  );
  assert.deepEqual(
    resolveTrainingProgressAssignment(
      'data-analytics-professional-certificate-google',
      [
        {
          programSlug: 'comptia-a-professional-certificate',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          isPrimary: false,
        },
      ],
    ),
    { programSlug: null, curriculumVersion: null },
  );
  assert.equal(
    resolveTrainingProgressCurriculumVersion(
      'data-analytics-professional-certificate-google',
      [
        {
          programSlug: 'comptia-a-professional-certificate',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          isPrimary: false,
        },
      ],
    ),
    null,
  );
});
