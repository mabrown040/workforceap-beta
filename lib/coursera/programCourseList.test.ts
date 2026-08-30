import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COURSERA_UMBRELLA_PROGRAM_ID,
  isUmbrellaB4BProgramId,
  loadValidatedProgramCatalog,
  loadValidatedProgramCourses,
  type ProgramCourseListDependencies,
} from './programCourseList';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  APPROVED_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';

test('identifies both the shipped and configured organization umbrella ids', () => {
  const previous = process.env.COURSERA_ORG_PROGRAM_ID;
  process.env.COURSERA_ORG_PROGRAM_ID = 'configured-umbrella';
  try {
    assert.equal(isUmbrellaB4BProgramId(COURSERA_UMBRELLA_PROGRAM_ID), true);
    assert.equal(isUmbrellaB4BProgramId(' configured-umbrella '), true);
    assert.equal(isUmbrellaB4BProgramId('per-program-id'), false);
  } finally {
    if (previous === undefined) delete process.env.COURSERA_ORG_PROGRAM_ID;
    else process.env.COURSERA_ORG_PROGRAM_ID = previous;
  }
});

test('learner-scoped curriculum versions preserve legacy and approved denominators', async () => {
  const dependencies: ProgramCourseListDependencies = {
    async loadCourseDbRows() {
      return [];
    },
    async loadCanonicalMappingRows() {
      return [];
    },
    async loadCourseraContents() {
      return { status: 'unavailable', contents: [] };
    },
  };

  const cases = [
    ['ux-design-professional-certificate-google', 8, 8],
    ['data-science-professional-certificate-ibm', 9, 9],
    ['data-analytics-professional-certificate-google', 13, 11],
  ] as const;
  for (const [programSlug, legacyCount, approvedCount] of cases) {
    const legacy = await loadValidatedProgramCourses(
      {
        organizationId: 'org-1',
        programSlug,
        curriculumVersion: LEGACY_CURRICULUM_VERSION,
        checkB4BContents: false,
      },
      dependencies,
    );
    const approved = await loadValidatedProgramCourses(
      {
        organizationId: 'org-1',
        programSlug,
        curriculumVersion: APPROVED_CURRICULUM_VERSION,
        checkB4BContents: false,
      },
      dependencies,
    );
    assert.equal(legacy.source, 'curriculum_assignment');
    assert.equal(approved.source, 'curriculum_assignment');
    assert.equal(legacy.courses.length, legacyCount);
    assert.equal(approved.courses.length, approvedCount);
  }
});

test('approved WorkforceAP labs never inherit stale provider ids or slugs', async () => {
  const programSlug = 'data-analytics-professional-certificate-google';
  const localSlug = 'management-data-analytics-lab-workforce-readiness';
  const result = await loadValidatedProgramCourses(
    {
      organizationId: 'org-1',
      programSlug,
      curriculumVersion: APPROVED_CURRICULUM_VERSION,
      checkB4BContents: false,
    },
    {
      async loadCourseDbRows() {
        return [{
          programSlug,
          courseSlug: localSlug,
          name: 'Stale legacy provider row',
          estimatedHours: 10,
          courseraCourseId: 'legacy-provider-id',
          courseraSlug: 'legacy-provider-slug',
        }];
      },
      async loadCanonicalMappingRows() {
        return [];
      },
      async loadCourseraContents() {
        return { status: 'unavailable', contents: [] };
      },
    },
  );

  const localCourse = result.courses.find((course) => course.slug === localSlug);
  assert.ok(localCourse);
  assert.equal(localCourse.kind, 'workforceap');
  assert.equal(localCourse.courseraCourseId, undefined);
  assert.equal(localCourse.courseraSlug, undefined);
  assert.ok(!result.unmappedSlugs.includes(localSlug));
  assert.equal(result.catalogHealth.localCourseCount, 1);
  assert.equal(result.catalogHealth.syllabusCount, 10);
  assert.equal(result.catalogHealth.mappedCount, 10);
});

test('two WAP programs keep different validated denominators despite one umbrella catalog', async () => {
  const umbrellaContents = Array.from({ length: 80 }, (_, index) => ({
    id: `umbrella-course-${index + 1}`,
    contentType: 'Course',
  }));
  const dependencies: ProgramCourseListDependencies = {
    async loadCourseDbRows() {
      return [];
    },
    async loadCanonicalMappingRows() {
      return [];
    },
    async loadCourseraContents() {
      return { status: 'available', contents: umbrellaContents };
    },
  };

  const [digitalLiteracy, projectManagement] = await Promise.all([
    loadValidatedProgramCourses(
      {
        organizationId: 'org-1',
        programSlug: 'digital-literacy-empowerment-class',
      },
      dependencies,
    ),
    loadValidatedProgramCourses(
      {
        organizationId: 'org-1',
        programSlug: 'project-management-professional-certificate-microsoft',
      },
      dependencies,
    ),
  ]);

  assert.notEqual(digitalLiteracy.courses.length, 80);
  assert.notEqual(projectManagement.courses.length, 80);
  assert.notEqual(digitalLiteracy.courses.length, projectManagement.courses.length);
});

test('read-only audit skips the Coursera provider check', async () => {
  let providerCalls = 0;
  const dependencies: ProgramCourseListDependencies = {
    async loadCourseDbRows() {
      return [];
    },
    async loadCanonicalMappingRows() {
      return [];
    },
    async loadCourseraContents() {
      providerCalls += 1;
      return { status: 'available', contents: [] };
    },
  };

  await loadValidatedProgramCourses(
    {
      organizationId: 'org-1',
      programSlug: 'project-management-professional-certificate-microsoft',
      readOnlyAudit: true,
    },
    dependencies,
  );

  assert.equal(providerCalls, 0);
});

test('admin mapping binds a syllabus course and a non-empty provider catalog reports stale ids', async () => {
  const programSlug = 'digital-literacy-empowerment-class';
  const firstCourse = getProgramBySlug(programSlug)?.courses[0];
  assert.ok(firstCourse);
  const dependencies: ProgramCourseListDependencies = {
    async loadCourseDbRows() {
      return [];
    },
    async loadCanonicalMappingRows() {
      return [{
        courseraCourseId: 'mapped-course-id',
        canonicalProgramSlug: programSlug,
        canonicalCourseSlug: firstCourse.slug,
      }];
    },
    async loadCourseraContents() {
      return {
        status: 'available',
        contents: [{ id: 'different-live-id', contentType: 'Course' }],
      };
    },
  };

  const result = await loadValidatedProgramCourses(
    { organizationId: 'org-1', programSlug },
    dependencies,
  );

  assert.equal(result.courses[0]?.courseraCourseId, 'mapped-course-id');
  assert.equal(result.unmappedSlugs.includes(firstCourse.slug), false);
  assert.deepEqual(result.staleCourseraIds, ['mapped-course-id']);
});

test('an explicit legacy assignment preserves admin-corrected provider identity', async () => {
  const programSlug = 'digital-literacy-empowerment-class';
  const firstCourse = getProgramBySlug(programSlug)?.courses[0];
  assert.ok(firstCourse);

  const result = await loadValidatedProgramCourses(
    {
      organizationId: 'org-1',
      programSlug,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
      checkB4BContents: false,
    },
    {
      async loadCourseDbRows() {
        return [{
          programSlug,
          courseSlug: firstCourse.slug,
          name: firstCourse.name,
          estimatedHours: firstCourse.estimatedHours ?? 10,
          courseraCourseId: 'tenant-course-id',
          courseraSlug: 'tenant-course-slug',
        }];
      },
      async loadCanonicalMappingRows() {
        return [{
          courseraCourseId: 'admin-corrected-id',
          canonicalProgramSlug: programSlug,
          canonicalCourseSlug: firstCourse.slug,
        }];
      },
      async loadCourseraContents() {
        return { status: 'unavailable', contents: [] };
      },
    },
  );

  assert.equal(result.source, 'curriculum_assignment');
  assert.equal(result.courses.length, getProgramBySlug(programSlug)?.courses.length);
  assert.equal(result.courses[0]?.courseraCourseId, 'admin-corrected-id');
  assert.equal(result.unmappedSlugs.includes(firstCourse.slug), false);
});

test('canonical program reads query every reverse alias for Course DB and mappings', async () => {
  let courseDbSlugs: string[] = [];
  let mappingSlugs: string[] = [];
  const dependencies: ProgramCourseListDependencies = {
    async loadCourseDbRows({ programSlugs }) {
      courseDbSlugs = programSlugs;
      return [];
    },
    async loadCanonicalMappingRows({ programSlugs }) {
      mappingSlugs = programSlugs;
      return [];
    },
    async loadCourseraContents() {
      return { status: 'available', contents: [] };
    },
  };

  await loadValidatedProgramCourses(
    {
      organizationId: 'org-1',
      programSlug: 'ai-practitioner-professional-certificate-aws',
      checkB4BContents: false,
    },
    dependencies,
  );

  const expected = [
    'ai-practitioner-professional-certificate-aws',
    'ai-practitioner-professional-certificate',
    'ai-professional-practitioner-certificate',
    'ai-professional-developer-certificate-ibm',
  ];
  assert.deepEqual(new Set(courseDbSlugs), new Set(expected));
  assert.deepEqual(new Set(mappingSlugs), new Set(expected));
});

test('provider validation distinguishes an unavailable provider from a clean empty catalog', async () => {
  const programSlug = 'digital-literacy-empowerment-class';
  const firstCourse = getProgramBySlug(programSlug)?.courses[0];
  assert.ok(firstCourse);
  const base = {
    async loadCourseDbRows() {
      return [];
    },
    async loadCanonicalMappingRows() {
      return [{
        courseraCourseId: 'mapped-course-id',
        canonicalProgramSlug: programSlug,
        canonicalCourseSlug: firstCourse.slug,
      }];
    },
  };

  const unavailable = await loadValidatedProgramCourses(
    { organizationId: 'org-1', programSlug },
    {
      ...base,
      async loadCourseraContents() {
        return { status: 'unavailable', contents: [] };
      },
    },
  );
  const cleanEmpty = await loadValidatedProgramCourses(
    { organizationId: 'org-1', programSlug },
    {
      ...base,
      async loadCourseraContents() {
        return { status: 'available', contents: [] };
      },
    },
  );

  assert.equal(unavailable.catalogHealth.providerStatus, 'unavailable');
  assert.deepEqual(unavailable.staleCourseraIds, []);
  assert.equal(cleanEmpty.catalogHealth.providerStatus, 'available');
  assert.deepEqual(cleanEmpty.staleCourseraIds, ['mapped-course-id']);
});

test('provider health flags non-Course bindings and exposes off-syllabus extras without changing Y', async () => {
  const programSlug = 'digital-literacy-empowerment-class';
  const firstCourse = getProgramBySlug(programSlug)?.courses[0];
  assert.ok(firstCourse);
  const syllabusCount = getProgramBySlug(programSlug)?.courses.length ?? 0;
  const result = await loadValidatedProgramCourses(
    { organizationId: 'org-1', programSlug },
    {
      async loadCourseDbRows() {
        return [];
      },
      async loadCanonicalMappingRows() {
        return [{
          courseraCourseId: 'mapped-specialization-id',
          canonicalProgramSlug: programSlug,
          canonicalCourseSlug: firstCourse.slug,
        }];
      },
      async loadCourseraContents() {
        return {
          status: 'available',
          contents: [
            {
              id: 'mapped-specialization-id',
              contentType: 'Specialization',
              name: 'Wrong umbrella-like content',
            },
            { id: 'extra-course-id', contentType: 'Course', name: 'Additional activity' },
          ],
        };
      },
    },
  );

  assert.equal(result.courses.length, syllabusCount);
  assert.equal(result.catalogHealth.syllabusCount, syllabusCount);
  assert.equal(result.catalogHealth.mappedCount, 1);
  assert.equal(result.catalogHealth.validProviderCourseCount, 0);
  assert.deepEqual(result.catalogHealth.invalidContentTypeIds, [
    { id: 'mapped-specialization-id', contentType: 'Specialization' },
  ]);
  assert.deepEqual(
    result.catalogHealth.additionalCourseraContents.map((content) => content.id),
    ['extra-course-id'],
  );
});

test('admin catalog health batches provider and database reads across canonical aliases', async () => {
  const aiProgramSlug = 'ai-practitioner-professional-certificate-aws';
  const aiFirstCourse = getProgramBySlug(aiProgramSlug)?.courses[0];
  assert.ok(aiFirstCourse);
  let providerCalls = 0;
  let courseDbCalls = 0;
  let mappingCalls = 0;
  let queriedSlugs: string[] = [];

  const result = await loadValidatedProgramCatalog(
    {
      organizationId: 'org-1',
      programSlugs: [
        aiProgramSlug,
        'digital-literacy-empowerment-class',
      ],
    },
    {
      async loadCourseDbRows({ programSlugs }) {
        courseDbCalls += 1;
        queriedSlugs = programSlugs;
        return [];
      },
      async loadCanonicalMappingRows() {
        mappingCalls += 1;
        return [{
          courseraCourseId: 'alias-bound-course',
          canonicalProgramSlug: 'ai-professional-practitioner-certificate',
          canonicalCourseSlug: aiFirstCourse.slug,
        }];
      },
      async loadCourseraContents() {
        providerCalls += 1;
        return {
          status: 'available',
          contents: [{ id: 'alias-bound-course', contentType: 'Course' }],
        };
      },
    },
  );

  assert.equal(courseDbCalls, 1);
  assert.equal(mappingCalls, 1);
  assert.equal(providerCalls, 1);
  assert.ok(queriedSlugs.includes(aiProgramSlug));
  assert.ok(queriedSlugs.includes('ai-professional-practitioner-certificate'));
  const aiCatalog = result.find((entry) => entry.programSlug === aiProgramSlug);
  assert.equal(aiCatalog?.courses[0]?.courseraCourseId, 'alias-bound-course');
  assert.ok((aiCatalog?.catalogHealth.mappedCount ?? 0) > 0);
});
