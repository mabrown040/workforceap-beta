import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import {
  buildSkillMissionEventKey,
  parseSkillMissionEventKey,
  resolveSkillMissionAssignment,
  resolveSkillMissionForCurriculum,
  resolveSkillMissionsForCurriculum,
} from './skillMissionCurriculum';

const MANAGEMENT_PROGRAM = 'data-analytics-professional-certificate-google';
const DBA_PROGRAM = 'data-science-professional-certificate-ibm';
const UX_PROGRAM = 'ux-design-professional-certificate-google';

test('legacy curriculum retains the complete static mission catalog', () => {
  assert.equal(resolveSkillMissionsForCurriculum({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
  }).length, 8);
  assert.equal(resolveSkillMissionsForCurriculum({
    programSlug: DBA_PROGRAM,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
  }).length, 10);
  assert.equal(resolveSkillMissionsForCurriculum({
    programSlug: UX_PROGRAM,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
  }).length, 7);
});

test('approved curricula omit removed legacy missions and retain exact course matches', () => {
  const management = resolveSkillMissionsForCurriculum({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
  });
  const dba = resolveSkillMissionsForCurriculum({
    programSlug: DBA_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
  });
  const ux = resolveSkillMissionsForCurriculum({
    programSlug: UX_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
  });

  assert.deepEqual(management.map(({ definition }) => definition.courseSlug), [
    'data-analytics-course-1',
    'data-analytics-course-2',
  ]);
  assert.deepEqual(dba.map(({ definition }) => definition.courseSlug), [
    'data-science-course-4',
    'data-science-course-6',
  ]);
  assert.deepEqual(ux.map(({ definition }) => definition.courseSlug), [
    'ux-design-course-1',
    'ux-design-course-2',
    'ux-design-course-3',
    'ux-design-course-4',
    'ux-design-course-5',
    'ux-design-course-7',
  ]);
});

test('approved mission unlocks from the assigned canonical course slug', () => {
  const mission = resolveSkillMissionForCurriculum({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
    missionCourseSlug: 'data-analytics-course-1',
  });

  assert.ok(mission);
  assert.equal(mission.assignedCourseSlug, 'foundations-data');
  assert.ok(mission.unlockSlugs.includes('foundations-data'));
  assert.ok(!mission.unlockSlugs.includes('data-analytics-course-1'));
});

test('unknown curriculum versions and removed missions fail closed', () => {
  assert.deepEqual(resolveSkillMissionsForCurriculum({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: 'future-unapproved-v3',
  }), []);
  assert.equal(resolveSkillMissionForCurriculum({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
    missionCourseSlug: 'data-analytics-course-8',
  }), null);
});

test('approved mission events are version-scoped while legacy keys remain stable', () => {
  const legacyKey = buildSkillMissionEventKey({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    missionCourseSlug: 'data-analytics-course-1',
  });
  const approvedKey = buildSkillMissionEventKey({
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
    missionCourseSlug: 'data-analytics-course-1',
  });

  assert.equal(
    legacyKey,
    `${MANAGEMENT_PROGRAM}:mission:data-analytics-course-1`,
  );
  assert.equal(
    approvedKey,
    `${MANAGEMENT_PROGRAM}:curriculum:${APPROVED_CURRICULUM_VERSION}:mission:data-analytics-course-1`,
  );
  assert.deepEqual(parseSkillMissionEventKey(approvedKey), {
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
    missionCourseSlug: 'data-analytics-course-1',
  });
});

test('assignment resolution uses the pinned primary version and rejects unknown versions', () => {
  assert.deepEqual(resolveSkillMissionAssignment({
    enrolledProgram: MANAGEMENT_PROGRAM,
    enrollments: [{
      programSlug: MANAGEMENT_PROGRAM,
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
      isPrimary: true,
    }],
  }), {
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
  });

  assert.equal(resolveSkillMissionAssignment({
    enrolledProgram: MANAGEMENT_PROGRAM,
    enrollments: [{
      programSlug: MANAGEMENT_PROGRAM,
      curriculumVersion: 'future-unapproved-v3',
      isPrimary: true,
    }],
  }), null);
});

test('assignment resolution honors a requested secondary program only when assigned', () => {
  const enrollments = [
    {
      programSlug: UX_PROGRAM,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      isPrimary: true,
    },
    {
      programSlug: MANAGEMENT_PROGRAM,
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
      isPrimary: false,
    },
  ];

  assert.deepEqual(resolveSkillMissionAssignment({
    enrolledProgram: UX_PROGRAM,
    enrollments,
    requestedProgramSlug: MANAGEMENT_PROGRAM,
  }), {
    programSlug: MANAGEMENT_PROGRAM,
    curriculumVersion: APPROVED_CURRICULUM_VERSION,
  });
  assert.equal(resolveSkillMissionAssignment({
    enrolledProgram: UX_PROGRAM,
    enrollments,
    requestedProgramSlug: DBA_PROGRAM,
  }), null);
});
