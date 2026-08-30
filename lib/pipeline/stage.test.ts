import test from 'node:test';
import assert from 'node:assert/strict';

import { getPipelineStage, type PipelineStudent } from './stage';
import { PROGRAMS } from '@/lib/content/programs';
import { LEGACY_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';

const sampleProgram = PROGRAMS.find((p) => p.courses.length >= 2);
if (!sampleProgram) throw new Error('test fixture: need a program with at least 2 courses');
const sampleProgramSlug = sampleProgram.slug;

function baseStudent(overrides: Partial<PipelineStudent> = {}): PipelineStudent {
  return {
    id: 'member-1',
    fullName: 'Test Member',
    email: 'member@example.com',
    enrolledProgram: sampleProgramSlug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    enrolledAt: new Date('2026-01-01T00:00:00Z'),
    assessmentCompleted: true,
    coursesCompleted: [],
    deletedAt: null,
    placementRecord: null,
    userCertifications: [],
    applications: [],
    ...overrides,
  };
}

test('getPipelineStage uses live training rollup for in-training state', () => {
  const stage = getPipelineStage(baseStudent({
    memberProgramProgress: {
      programSlug: sampleProgramSlug,
      averagePercent: 50,
      coursesCompleted: 1,
    },
  }));

  assert.equal(stage, 'in_training');
});

test('getPipelineStage ignores live rollups for another program', () => {
  const stage = getPipelineStage(baseStudent({
    memberProgramProgress: {
      programSlug: 'other-program',
      averagePercent: 100,
      coursesCompleted: 99,
    },
  }));

  assert.equal(stage, 'enrolled');
});
