import test from 'node:test';
import assert from 'node:assert/strict';

import { PROGRAMS } from '@/lib/content/programs';
import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import { memberProgramCompleted, memberProgramProgressPct } from './memberProgress';

const sampleProgram = PROGRAMS.find((p) => p.courses.length >= 2);
if (!sampleProgram) throw new Error('test fixture: need a program with at least 2 courses');
const slugs = sampleProgram.courses.map((c) => c.slug);

test('memberProgramProgressPct prefers live rollup over stale legacy JSON', () => {
  const pct = memberProgramProgressPct({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [],
    liveProgress: {
      programSlug: sampleProgram.slug,
      averagePercent: 67,
      coursesCompleted: 1,
    },
  });

  assert.equal(pct, 67);
});

test('memberProgramProgressPct ignores rollups for other programs', () => {
  const pct = memberProgramProgressPct({
    enrolledProgram: sampleProgram.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    coursesCompleted: [slugs[0]],
    liveProgress: {
      programSlug: 'other-program',
      averagePercent: 99,
      coursesCompleted: 99,
    },
  });

  assert.equal(pct, Math.round((1 / sampleProgram.courses.length) * 100));
});

test('memberProgramCompleted prefers live rollup completion state', () => {
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: sampleProgram.slug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      coursesCompleted: [],
      liveProgress: {
        programSlug: sampleProgram.slug,
        averagePercent: 100,
        coursesCompleted: sampleProgram.courses.length,
      },
    }),
    true
  );
});

test('memberProgramCompleted never graduates from a percent-only shortcut', () => {
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: sampleProgram.slug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      coursesCompleted: [],
      liveProgress: {
        programSlug: sampleProgram.slug,
        averagePercent: 100,
        coursesCompleted: 1,
      },
    }),
    false
  );
});

test('memberProgramCompleted rejects an overcounted live rollup', () => {
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: sampleProgram.slug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      coursesCompleted: [],
      liveProgress: {
        programSlug: sampleProgram.slug,
        averagePercent: 100,
        coursesCompleted: sampleProgram.courses.length + 1,
      },
    }),
    false
  );
});

test('memberProgramCompleted falls back to legacy completed slugs', () => {
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: sampleProgram.slug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      coursesCompleted: slugs,
    }),
    true,
  );
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: sampleProgram.slug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      coursesCompleted: slugs.slice(0, 1),
    }),
    false,
  );
});

test('memberProgramCompleted accepts the approved Management 11-of-11 rollup', () => {
  const programSlug = 'data-analytics-professional-certificate-google';
  assert.equal(
    memberProgramCompleted({
      enrolledProgram: programSlug,
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
      coursesCompleted: null,
      liveProgress: {
        programSlug,
        averagePercent: 100,
        coursesCompleted: 11,
      },
    }),
    true,
  );
});
