import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APPROVED_CURRICULUM_VERSION,
  APPROVED_PROGRAM_CURRICULA,
  getApprovedCurriculumCourseAliases,
  getProgramCurriculumManifest,
  isExternalCurriculumTrackReady,
  isExternalCurriculumTrackAssignmentReady,
  normalizeCourseraCourseId,
} from './programCurriculumManifest';
import { getProgramSyllabus } from '@/shared/programSyllabi';

const EXPECTED = {
  'ux-design-professional-certificate-google': {
    courses: 8,
    providerCourses: 7,
    hours: 160,
    sha: '6ac3ac7d95b30786356fbc702245ac0ea42d5410594aa6add3629bdf2385ff08',
    overlap: 6,
  },
  'data-science-professional-certificate-ibm': {
    courses: 9,
    providerCourses: 9,
    hours: 160,
    sha: 'f1c3f8eb3838bc76bc7863b72ab7245ca5f632131cde28775f1b212037a1289f',
    overlap: 5,
  },
  'data-analytics-professional-certificate-google': {
    courses: 11,
    providerCourses: 10,
    hours: 160,
    sha: '49079c1479a516089f3a374dbcbc35dc2b0b267eb99c22b22db93ea9777a41af',
    overlap: 4,
  },
} as const;

// Read-only provider audit captured before this release. This snapshot is
// deliberately separate from DISCOVERED_COURSERA_PROGRAMS: that catalog can
// know an approved course even when the live learner track does not contain it.
const LEGACY_TRACK_PROVIDER_IDS: Record<string, readonly string[]> = {
  'ux-design-professional-certificate-google': [
    'aDPeKsbTEeqqzg7nmRt_BQ',
    'R-r2uwp-Eeuf7w5EwYPThw',
    'TjOLkAp-EeubJBIM7h4jow',
    'U7e_Lgp-EeubJBIM7h4jow',
    'W5kcLAp-Eeua7xKR7OK1aw',
    'coP2hgp-Eeuh2QpCvqFzYQ',
  ],
  'data-science-professional-certificate-ibm': [
    'zQV3KCOCEeui6AoQjSZBrQ',
    'GDQMSxDWEeitFhJL4G-A_g',
    'ejOz7RDUEei99hK0xs-tsg',
    'XXZBGc97EeufchLeGgZGZQ',
    'V2tYXNFWEe-3_Q7tYtYdfw',
  ],
  'data-analytics-professional-certificate-google': [
    '1psdSVOIEeyc0w4h2jEFEQ',
    'zPU_kmRfEe-e0g4kKcdYJQ',
    'kvb6uMbTEeqZOA5eKDHL-w',
    'ZEB-Lgp9Eeun_RJEc0KNDw',
  ],
};

describe('approved Coursera curriculum manifest', () => {
  it('binds the approved 8/9/11 denominators to the exact regulated syllabi', () => {
    assert.equal(APPROVED_PROGRAM_CURRICULA.length, 3);
    for (const manifest of APPROVED_PROGRAM_CURRICULA) {
      const expected = EXPECTED[manifest.programSlug as keyof typeof EXPECTED];
      const syllabus = getProgramSyllabus(manifest.programSlug);
      assert.ok(expected);
      assert.ok(syllabus);
      assert.equal(manifest.version, APPROVED_CURRICULUM_VERSION);
      assert.equal(manifest.syllabusSha256, expected.sha);
      assert.equal(manifest.syllabusSha256, syllabus.sourceSha256);
      assert.equal(manifest.courses.length, expected.courses);
      assert.equal(
        manifest.courses.filter((course) => course.kind === 'coursera').length,
        expected.providerCourses,
      );
      assert.equal(
        manifest.courses.reduce((sum, course) => sum + course.estimatedHours, 0),
        expected.hours,
      );
      assert.deepEqual(
        manifest.courses.map((course) => course.name),
        syllabus.courses.map((course) => course.name),
      );
      assert.equal(new Set(manifest.courses.map((course) => course.slug)).size, expected.courses);
      assert.equal(manifest.externalTrack.status, 'pending');
      assert.equal(manifest.externalTrack.collectionId, null);
      assert.equal(manifest.externalTrack.assignmentMode, 'disabled');
    }
  });

  it('uses provider ids only for Coursera courses and preserves local lab aliases', () => {
    for (const manifest of APPROVED_PROGRAM_CURRICULA) {
      for (const course of manifest.courses) {
        if (course.kind === 'workforceap') {
          assert.equal(course.courseraCourseId, undefined);
          assert.equal(course.courseraSlug, undefined);
        } else {
          assert.ok(course.courseraCourseId);
          assert.equal(course.courseraCourseId?.startsWith('Course~'), false);
          assert.ok(course.courseraSlug);
        }
      }
    }

    assert.equal(
      getApprovedCurriculumCourseAliases('ux-design-professional-certificate-google').get(
        'ux-design-professional-certificate-google-course-8',
      ),
      'ux-ui-lab-project-test-preparation',
    );
  });

  it('matches the known provider overlap without treating new approved courses as already tracked', () => {
    for (const manifest of APPROVED_PROGRAM_CURRICULA) {
      const knownIds = new Set(
        (LEGACY_TRACK_PROVIDER_IDS[manifest.programSlug] ?? []).map(normalizeCourseraCourseId),
      );
      const overlap = manifest.courses.filter(
        (course) => course.kind === 'coursera' && knownIds.has(course.courseraCourseId ?? ''),
      ).length;
      assert.equal(overlap, EXPECTED[manifest.programSlug as keyof typeof EXPECTED].overlap);
    }
  });

  it('normalizes prefixed provider ids and looks up only the requested version', () => {
    assert.equal(normalizeCourseraCourseId(' Course~abc_123 '), 'abc_123');
    assert.equal(normalizeCourseraCourseId('Specialization~abc_123'), 'abc_123');
    assert.equal(normalizeCourseraCourseId('abc_123'), 'abc_123');
    assert.ok(
      getProgramCurriculumManifest(
        'ux-design-professional-certificate-google',
        APPROVED_CURRICULUM_VERSION,
      ),
    );
    assert.equal(
      getProgramCurriculumManifest('ux-design-professional-certificate-google', 'legacy-v1'),
      null,
    );
  });

  it('requires both validated status and a non-empty collection id before activation', () => {
    assert.equal(
      isExternalCurriculumTrackReady({
        status: 'validated',
        collectionId: 'collection-1',
        assignmentMode: 'disabled',
      }),
      true,
    );
    assert.equal(
      isExternalCurriculumTrackReady({
        status: 'validated',
        collectionId: null,
        assignmentMode: 'disabled',
      }),
      false,
    );
    assert.equal(
      isExternalCurriculumTrackReady({
        status: 'validated',
        collectionId: '   ',
        assignmentMode: 'disabled',
      }),
      false,
    );
    assert.equal(
      isExternalCurriculumTrackReady({
        status: 'pending',
        collectionId: 'collection-1',
        assignmentMode: 'enabled',
      }),
      false,
    );
  });

  it('separates provider validation, canary rollout, and broad assignment', () => {
    const canaryTrack = {
      status: 'validated',
      collectionId: 'collection-1',
      assignmentMode: 'canary',
    } as const;
    const enabledTrack = { ...canaryTrack, assignmentMode: 'enabled' } as const;

    assert.equal(isExternalCurriculumTrackAssignmentReady(canaryTrack), false);
    assert.equal(
      isExternalCurriculumTrackAssignmentReady(canaryTrack, { explicitCanary: true }),
      true,
    );
    assert.equal(isExternalCurriculumTrackAssignmentReady(enabledTrack), true);
  });
});
