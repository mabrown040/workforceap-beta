import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/coursera/curriculumMapping', () => ({
  resolveCurriculumMappingsForCourse: vi.fn(),
}));

import { resolveCurriculumMappingsForCourse } from '@/lib/coursera/curriculumMapping';
import { APPROVED_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';
import { getProgramBySlug } from '@/lib/content/programs';
import { resolveProgramCourseWithCatalogFallback } from '@/lib/member/programCourseMatch';

describe('approved curriculum provider-id matching', () => {
  beforeEach(() => {
    vi.mocked(resolveCurriculumMappingsForCourse).mockResolvedValue({
      targets: [],
      status: 'unmapped',
    });
  });

  it('fails closed when an unknown provider id reuses an approved slug and title', async () => {
    const program = getProgramBySlug('ux-design-professional-certificate-google');
    expect(program).toBeTruthy();
    const course = program!.courses[0]!;

    await expect(
      resolveProgramCourseWithCatalogFallback(
        program!,
        {
          courseraCourseId: 'retired-or-unknown-provider-id',
          enrolledProgramSlug: program!.slug,
          courseSlug: course.slug,
          courseName: course.name,
        },
        { curriculumVersion: APPROVED_CURRICULUM_VERSION },
      ),
    ).resolves.toBeNull();
  });

  it('keeps exact slug fallback for providerless WorkforceAP completion', async () => {
    const program = getProgramBySlug('ux-design-professional-certificate-google');
    expect(program).toBeTruthy();
    const course = program!.courses[0]!;

    await expect(
      resolveProgramCourseWithCatalogFallback(
        program!,
        {
          enrolledProgramSlug: program!.slug,
          courseSlug: course.slug,
          courseName: course.name,
        },
        { curriculumVersion: APPROVED_CURRICULUM_VERSION },
      ),
    ).resolves.toEqual({ slug: course.slug, name: course.name });
  });
});
