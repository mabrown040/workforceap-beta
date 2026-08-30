import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getProgramCurriculumManifest } from '@/lib/content/programCurriculumManifest';
import {
  drainB4BValidationPages,
  validateApprovedCurriculumCatalog,
  validateApprovedCurriculumTrack,
} from './validateApprovedCurriculumTrack';

describe('B4B validation pagination', () => {
  it('drains reported next offsets before returning proof input', async () => {
    const starts: number[] = [];
    const result = await drainB4BValidationPages(
      async ({ start }) => {
        starts.push(start);
        if (start === 0) return { elements: ['a', 'b'], paging: { next: 4, total: 5 } };
        return { elements: ['c'], paging: { total: 5 } };
      },
      { pageLimit: 2 },
    );
    assert.deepEqual(starts, [0, 4]);
    assert.deepEqual(result.elements, ['a', 'b', 'c']);
    assert.equal(result.pagesFetched, 2);
  });

  it('fails instead of certifying repeated, invalid, or truncated pagination', async () => {
    await assert.rejects(
      () => drainB4BValidationPages(
        async () => ({ elements: ['a'], paging: { next: 0, total: 2 } }),
        { pageLimit: 1 },
      ),
      /invalid next offset/,
    );
    await assert.rejects(
      () => drainB4BValidationPages(
        async () => ({ elements: [], paging: { total: 2 } }),
        { pageLimit: 1 },
      ),
      /ended before its reported total/,
    );
    await assert.rejects(
      () => drainB4BValidationPages(
        async ({ start }) => ({ elements: [start], paging: {} }),
        { pageLimit: 1, safetyCap: 2 },
      ),
      /exceeded 2 pages/,
    );
  });
});

function providerProgram(programSlug: string) {
  const manifest = getProgramCurriculumManifest(programSlug);
  assert.ok(manifest);
  return {
    id: 'candidate-track-id',
    slug: 'candidate-track',
    name: 'Candidate track',
    url: null,
    courses: manifest.courses
      .filter((course) => course.kind === 'coursera')
      .map((course) => ({
        id: `Course~${course.courseraCourseId}`,
        slug: course.courseraSlug!,
        name: course.name,
        contentType: 'Course',
      })),
  };
}

describe('approved Coursera track validation', () => {
  it('accepts only the exact normalized provider set in manifest order', () => {
    const validation = validateApprovedCurriculumTrack({
      programSlug: 'data-science-professional-certificate-ibm',
      providerProgram: providerProgram('data-science-professional-certificate-ibm'),
    });
    assert.equal(validation.exactMatch, true);
    assert.deepEqual(validation.missingProviderIds, []);
    assert.deepEqual(validation.extraProviderIds, []);
  });

  it('fails closed on missing, extra, duplicate, wrong-type, or reordered content', () => {
    const candidate = providerProgram('ux-design-professional-certificate-google');
    const first = candidate.courses[0]!;
    candidate.courses = [
      candidate.courses[1]!,
      { ...first, contentType: 'Specialization' },
      ...candidate.courses.slice(2, -1),
      { id: 'extra-id', slug: 'extra', name: 'Extra', contentType: 'Course' },
      { ...first },
    ];
    const validation = validateApprovedCurriculumTrack({
      programSlug: 'ux-design-professional-certificate-google',
      providerProgram: candidate,
    });
    assert.equal(validation.exactMatch, false);
    assert.equal(validation.orderMatches, false);
    assert.ok(validation.missingProviderIds.length > 0);
    assert.ok(validation.extraProviderIds.includes('extra-id'));
    assert.ok(validation.duplicateProviderIds.includes(first.id.replace('Course~', '')));
    assert.ok(validation.nonCourseContents.length > 0);
  });
});

describe('approved Coursera organization catalog validation', () => {
  it('proves approved provider ids, types, and slugs without counting catalog extras', () => {
    const manifest = getProgramCurriculumManifest(
      'ux-design-professional-certificate-google',
    );
    assert.ok(manifest);
    const providerContents = manifest.courses
      .filter((course) => course.kind === 'coursera')
      .map((course) => ({
        id: `Course~${course.courseraCourseId}`,
        slug: course.courseraSlug,
        name: course.name,
        contentType: 'Course',
      }));
    providerContents.push({
      id: 'off-syllabus-id',
      slug: 'off-syllabus',
      name: 'Off syllabus',
      contentType: 'Course',
    });

    const validation = validateApprovedCurriculumCatalog({
      programSlug: manifest.programSlug,
      providerContents,
    });

    assert.equal(validation.exactMappingValid, true);
    assert.equal(
      validation.matchedProviderCourses.length,
      manifest.expectedProviderCourseCount,
    );
    assert.deepEqual(validation.missingProviderIds, []);
  });

  it('fails closed on missing, duplicate, wrong-type, or provider-slug drift', () => {
    const manifest = getProgramCurriculumManifest(
      'data-science-professional-certificate-ibm',
    );
    assert.ok(manifest);
    const courses = manifest.courses.filter((course) => course.kind === 'coursera');
    const providerContents = courses.slice(1).map((course) => ({
      id: course.courseraCourseId!,
      slug: course.courseraSlug,
      name: course.name,
      contentType: 'Course',
    }));
    providerContents.push({
      ...providerContents[0]!,
      slug: 'provider-renamed-slug',
      contentType: 'Specialization',
    });

    const validation = validateApprovedCurriculumCatalog({
      programSlug: manifest.programSlug,
      providerContents,
    });

    assert.equal(validation.exactMappingValid, false);
    assert.deepEqual(validation.missingProviderIds, [courses[0]!.courseraCourseId]);
    assert.deepEqual(validation.duplicateProviderIds, [courses[1]!.courseraCourseId]);
    assert.equal(validation.nonCourseContents.length, 1);
    assert.equal(validation.providerSlugDrift.length, 1);
  });

  it('fails closed when the provider omits the slug needed to prove identity', () => {
    const manifest = getProgramCurriculumManifest(
      'ux-design-professional-certificate-google',
    );
    assert.ok(manifest);
    const providerContents = manifest.courses
      .filter((course) => course.kind === 'coursera')
      .map((course, index) => ({
        id: course.courseraCourseId!,
        slug: index === 0 ? null : course.courseraSlug,
        name: course.name,
        contentType: 'Course',
      }));

    const validation = validateApprovedCurriculumCatalog({
      programSlug: manifest.programSlug,
      providerContents,
    });

    assert.equal(validation.exactMappingValid, false);
    assert.deepEqual(validation.providerSlugDrift, [{
      id: providerContents[0]!.id,
      expectedSlug: manifest.courses[0]!.courseraSlug,
      providerSlug: null,
    }]);
  });
});
