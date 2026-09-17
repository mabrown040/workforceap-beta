import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';
import { emptyCanonicalMappingIndex } from './canonicalMapping';
import {
  buildCurriculumMappingIndex,
  isMissingCurriculumMappingTableError,
  resolveProviderCourseMappings,
  resolveCurriculumMappingsForCourse,
} from './curriculumMapping';

const rows = [
  {
    courseraCourseId: 'shared-id',
    courseraCourseSlug: 'shared-course',
    canonicalProgramSlug: 'program-a',
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    canonicalCourseSlug: 'course-a',
  },
  {
    courseraCourseId: 'Course~shared-id',
    courseraCourseSlug: 'shared-course',
    canonicalProgramSlug: 'program-b',
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    canonicalCourseSlug: 'course-b',
  },
];

describe('versioned Coursera curriculum mappings', () => {
  it('preserves every legitimate target instead of overwriting the last row', () => {
    const index = buildCurriculumMappingIndex(rows);
    assert.equal(index.byCourseraCourseId.get('shared-id')?.length, 2);
    assert.equal(index.byCourseraCourseSlug.get('shared-course')?.length, 2);
  });

  it('refuses a same-version row that drifts from the frozen approved manifest', () => {
    const index = buildCurriculumMappingIndex([
      {
        courseraCourseId: 'wrong-provider-id',
        courseraCourseSlug: 'foundations-user-experience-design',
        canonicalProgramSlug: 'ux-design-professional-certificate-google',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        canonicalCourseSlug: 'foundations-user-experience-design',
      },
    ]);
    assert.equal(index.byCourseraCourseId.size, 0);
  });

  it('resolves prefixed ids against the learner assignment', async () => {
    const result = await resolveCurriculumMappingsForCourse({
      courseraCourseId: 'Specialization~shared-id',
      assignments: [
        {
          programSlug: 'program-b',
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
        },
      ],
      index: buildCurriculumMappingIndex(rows),
    });
    assert.equal(result.status, 'matched_assignment');
    assert.equal(result.targets.length, 1);
    assert.equal(result.targets[0]?.courseSlug, 'course-b');
  });

  it('returns ambiguity instead of arbitrary credit without an assignment', async () => {
    const result = await resolveCurriculumMappingsForCourse({
      courseraCourseId: 'shared-id',
      assignments: [],
      index: buildCurriculumMappingIndex(rows),
    });
    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(result.targets, []);
  });

  it('recognizes only the missing-table deployment compatibility error', () => {
    assert.equal(isMissingCurriculumMappingTableError({ code: 'P2021' }), true);
    assert.equal(
      isMissingCurriculumMappingTableError(
        new Error('relation "coursera_curriculum_course_mappings" does not exist'),
      ),
      true,
    );
    assert.equal(isMissingCurriculumMappingTableError({ code: 'P2022' }), false);
    assert.equal(isMissingCurriculumMappingTableError(new Error('connection timed out')), false);
  });

  it('resolves the real shared Python course to a legacy Software-only assignment', async () => {
    const providerId = 'ejOz7RDUEei99hK0xs-tsg';
    const result = await resolveProviderCourseMappings({
      courseraCourseId: providerId,
      assignments: [
        {
          programSlug: 'software-developer-professional-certificate-ibm',
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
        },
      ],
      curriculumIndex: buildCurriculumMappingIndex([
        {
          courseraCourseId: providerId,
          courseraCourseSlug: 'python-for-applied-data-science-ai',
          canonicalProgramSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          canonicalCourseSlug: 'python-for-applied-data-science-ai',
        },
      ]),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
    });

    assert.equal(result.status, 'matched_assignment');
    assert.deepEqual(
      result.targets.map((target) => [target.programSlug, target.curriculumVersion]),
      [[
        'software-developer-professional-certificate-ibm',
        LEGACY_CURRICULUM_VERSION,
      ]],
    );
  });

  it('fans the real shared Python course into approved DBA and legacy Software', async () => {
    const providerId = 'ejOz7RDUEei99hK0xs-tsg';
    const result = await resolveProviderCourseMappings({
      courseraCourseId: providerId,
      assignments: [
        {
          programSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
        },
        {
          programSlug: 'software-developer-professional-certificate-ibm',
          curriculumVersion: LEGACY_CURRICULUM_VERSION,
        },
      ],
      curriculumIndex: buildCurriculumMappingIndex([
        {
          courseraCourseId: providerId,
          courseraCourseSlug: 'python-for-applied-data-science-ai',
          canonicalProgramSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          canonicalCourseSlug: 'python-for-applied-data-science-ai',
        },
      ]),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
    });

    assert.equal(result.status, 'matched_assignment');
    assert.deepEqual(
      result.targets.map((target) => [target.programSlug, target.curriculumVersion]),
      [
        [
          'data-science-professional-certificate-ibm',
          APPROVED_CURRICULUM_VERSION,
        ],
        [
          'software-developer-professional-certificate-ibm',
          LEGACY_CURRICULUM_VERSION,
        ],
      ],
    );
  });

  it('does not discover a phantom legacy program beside an approved-only match', async () => {
    const providerId = 'ejOz7RDUEei99hK0xs-tsg';
    const result = await resolveProviderCourseMappings({
      courseraCourseId: providerId,
      assignments: [
        {
          programSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
        },
      ],
      curriculumIndex: buildCurriculumMappingIndex([
        {
          courseraCourseId: providerId,
          courseraCourseSlug: 'python-for-applied-data-science-ai',
          canonicalProgramSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          canonicalCourseSlug: 'python-for-applied-data-science-ai',
        },
      ]),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
    });

    assert.equal(result.status, 'matched_assignment');
    assert.deepEqual(
      result.targets.map((target) => [target.programSlug, target.curriculumVersion]),
      [
        [
          'data-science-professional-certificate-ibm',
          APPROVED_CURRICULUM_VERSION,
        ],
      ],
    );
  });

  it('keeps the real shared Python course raw-only without assignments', async () => {
    const providerId = 'ejOz7RDUEei99hK0xs-tsg';
    const result = await resolveProviderCourseMappings({
      courseraCourseId: providerId,
      assignments: [],
      curriculumIndex: buildCurriculumMappingIndex([
        {
          courseraCourseId: providerId,
          courseraCourseSlug: 'python-for-applied-data-science-ai',
          canonicalProgramSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          canonicalCourseSlug: 'python-for-applied-data-science-ai',
        },
      ]),
      canonicalIndex: emptyCanonicalMappingIndex(),
    });

    assert.equal(result.status, 'ambiguous');
    assert.deepEqual(result.targets, []);
  });

  it('keeps a unique approved-v2-only provider mapping raw without an assignment', async () => {
    const providerId = 'zQV3KCOCEeui6AoQjSZBrQ';
    const result = await resolveProviderCourseMappings({
      courseraCourseId: providerId,
      assignments: [],
      curriculumIndex: buildCurriculumMappingIndex([
        {
          courseraCourseId: providerId,
          courseraCourseSlug: 'introduction-to-data-engineering',
          canonicalProgramSlug: 'data-science-professional-certificate-ibm',
          curriculumVersion: APPROVED_CURRICULUM_VERSION,
          canonicalCourseSlug: 'introduction-to-data-engineering',
        },
      ]),
      canonicalIndex: emptyCanonicalMappingIndex(),
    });

    assert.equal(result.status, 'unmapped');
    assert.deepEqual(result.targets, []);
  });

  it('never uses a right slug to override a wrong non-empty provider id', async () => {
    const result = await resolveProviderCourseMappings({
      courseraCourseId: 'wrong-provider-id',
      courseraCourseSlug: 'introduction-to-data-engineering',
      assignments: [{
        programSlug: 'data-science-professional-certificate-ibm',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
      }],
      curriculumIndex: buildCurriculumMappingIndex([{
        courseraCourseId: 'zQV3KCOCEeui6AoQjSZBrQ',
        courseraCourseSlug: 'introduction-to-data-engineering',
        canonicalProgramSlug: 'data-science-professional-certificate-ibm',
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        canonicalCourseSlug: 'introduction-to-data-engineering',
      }]),
      canonicalIndex: emptyCanonicalMappingIndex(),
    });
    assert.equal(result.status, 'unmapped');
    assert.deepEqual(result.targets, []);
  });
});

describe('Learning Path collection attribution', () => {
  const legacyAssignments = (programSlug: string) => [
    { programSlug, curriculumVersion: LEGACY_CURRICULUM_VERSION },
  ];

  it('narrows an unassigned shared course to the program of the path it was taken under', async () => {
    const resolution = await resolveProviderCourseMappings({
      courseraCourseId: 'shared-id',
      assignments: [],
      curriculumIndex: buildCurriculumMappingIndex(rows),
      canonicalIndex: emptyCanonicalMappingIndex(),
      collectionProgramSlug: 'program-b',
    });
    assert.equal(resolution.status, 'unique_unassigned');
    assert.deepEqual(
      resolution.targets.map((target) => `${target.programSlug}/${target.courseSlug}`),
      ['program-b/course-b'],
    );
  });

  it('lets an exact assignment match outrank the collection', async () => {
    const resolution = await resolveProviderCourseMappings({
      courseraCourseId: 'shared-id',
      assignments: legacyAssignments('program-a'),
      curriculumIndex: buildCurriculumMappingIndex(rows),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
      collectionProgramSlug: 'program-b',
    });
    assert.equal(resolution.status, 'matched_assignment');
    assert.deepEqual(
      resolution.targets.map((target) => target.programSlug),
      ['program-a'],
    );
  });

  it('discovers only inside the path program when nothing assigned matched', async () => {
    const inside = await resolveProviderCourseMappings({
      courseraCourseId: 'shared-id',
      assignments: legacyAssignments('program-c'),
      curriculumIndex: buildCurriculumMappingIndex(rows),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
      collectionProgramSlug: 'program-a',
    });
    assert.equal(inside.status, 'unique_unassigned');
    assert.deepEqual(inside.targets.map((target) => target.programSlug), ['program-a']);

    // Coursera says the learner is on a path whose program lists no such
    // course: no neighbour program may be conjured from the shared id.
    const outside = await resolveProviderCourseMappings({
      courseraCourseId: 'shared-id',
      assignments: legacyAssignments('program-c'),
      curriculumIndex: buildCurriculumMappingIndex(rows),
      canonicalIndex: emptyCanonicalMappingIndex(),
      allowLegacyDiscovery: true,
      collectionProgramSlug: 'program-z',
    });
    assert.equal(outside.status, 'unmapped');
    assert.deepEqual(outside.targets, []);
  });

  it('keeps discovery unrestricted when the path is unresolved (null) or absent', async () => {
    for (const collectionProgramSlug of [null, undefined]) {
      const resolution = await resolveProviderCourseMappings({
        courseraCourseId: 'shared-id',
        assignments: legacyAssignments('program-c'),
        curriculumIndex: buildCurriculumMappingIndex(rows),
        canonicalIndex: emptyCanonicalMappingIndex(),
        allowLegacyDiscovery: true,
        collectionProgramSlug,
      });
      assert.equal(resolution.status, 'ambiguous');
    }
  });
});
