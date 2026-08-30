import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getProgramBySlug } from '@/lib/content/programs';
import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import {
  activeCurriculumVersion,
  getProgramCoursesForCurriculumVersion,
  selectCurriculumMappingTargets,
} from './curriculumAssignment';

describe('curriculum assignment', () => {
  it('keeps new assignments on legacy while exact external tracks are pending', () => {
    assert.equal(
      activeCurriculumVersion('data-science-professional-certificate-ibm'),
      LEGACY_CURRICULUM_VERSION,
    );
  });

  it('canonicalizes accepted program aliases before selecting a curriculum generation', () => {
    assert.equal(
      activeCurriculumVersion('management-data-analyst-professional-certificate-google-ibm'),
      activeCurriculumVersion('data-analytics-professional-certificate-google'),
    );
  });

  it('defaults blank migrated rows to legacy but rejects unknown immutable versions', () => {
    const program = getProgramBySlug('data-analytics-professional-certificate-google');
    assert.ok(program);
    assert.equal(getProgramCoursesForCurriculumVersion(program, null).length, 13);
    assert.throws(
      () => getProgramCoursesForCurriculumVersion(program, '2026-approved-v2-typo'),
      /Unknown curriculum version/,
    );
  });

  it('preserves deployed denominators as UX 8->8, DBA 9->9, Management 13->11', () => {
    const cases = [
      ['ux-design-professional-certificate-google', 8, 8],
      ['data-science-professional-certificate-ibm', 9, 9],
      ['data-analytics-professional-certificate-google', 13, 11],
    ] as const;
    for (const [slug, legacyCount, approvedCount] of cases) {
      const program = getProgramBySlug(slug);
      assert.ok(program);
      assert.equal(
        getProgramCoursesForCurriculumVersion(program, LEGACY_CURRICULUM_VERSION).length,
        legacyCount,
      );
      assert.equal(
        getProgramCoursesForCurriculumVersion(program, APPROVED_CURRICULUM_VERSION).length,
        approvedCount,
      );
    }
  });

  it('selects a shared provider id only for the learner assigned to that version', () => {
    const candidates = [
      {
        programSlug: 'data-science-professional-certificate-ibm',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        courseSlug: 'python-for-applied-data-science-ai',
        courseraCourseId: 'Course~shared-id',
      },
      {
        programSlug: 'ai-software-developer-professional-certificate-ibm',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        courseSlug: 'python-for-applied-data-science-ai',
        courseraCourseId: 'shared-id',
      },
    ];
    const result = selectCurriculumMappingTargets({
      candidates,
      assignments: [
        {
          programSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
        },
      ],
    });
    assert.equal(result.status, 'matched_assignment');
    assert.deepEqual(
      result.targets.map((target) => target.programSlug),
      ['data-science-professional-certificate-ibm'],
    );
    assert.equal(result.targets[0]?.courseraCourseId, 'shared-id');
  });

  it('fans out to two assigned curricula but keeps unassigned ambiguity raw-only', () => {
    const candidates = [
      {
        programSlug: 'program-a',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        courseSlug: 'shared-a',
        courseraCourseId: 'shared-id',
      },
      {
        programSlug: 'program-b',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        courseSlug: 'shared-b',
        courseraCourseId: 'shared-id',
      },
    ];
    assert.equal(
      selectCurriculumMappingTargets({ candidates, assignments: [] }).status,
      'ambiguous',
    );
    const matched = selectCurriculumMappingTargets({
      candidates,
      assignments: candidates.map((candidate) => ({
        programSlug: candidate.programSlug,
        curriculumVersion: candidate.curriculumVersion,
      })),
    });
    assert.equal(matched.status, 'matched_assignment');
    assert.equal(matched.targets.length, 2);
  });

  it('allows one distinct unassigned target without guessing across programs', () => {
    const result = selectCurriculumMappingTargets({
      candidates: [
        {
          programSlug: 'program-a',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          courseSlug: 'course-a',
          courseraCourseId: 'Course~course-id',
        },
      ],
      assignments: [],
    });
    assert.equal(result.status, 'unique_unassigned');
    assert.equal(result.targets[0]?.courseraCourseId, 'course-id');
  });
});
