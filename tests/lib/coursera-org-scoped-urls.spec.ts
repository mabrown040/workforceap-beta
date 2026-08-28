import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/coursera/b4bClient', () => ({
  listPrograms: vi.fn(),
}));

vi.mock('@/lib/coursera/configCore', () => ({
  resolveCourseraPublicProgramUrl: vi.fn(),
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(),
}));

import { listPrograms } from '@/lib/coursera/b4bClient';
import { resolveCourseraPublicProgramUrl } from '@/lib/coursera/configCore';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  _resetOrgScopedUrlCacheForTesting,
  getOrgScopedCourseUrl,
} from '@/lib/coursera/orgScopedUrls';

describe('getOrgScopedCourseUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetOrgScopedUrlCacheForTesting();
    vi.mocked(resolveCourseraPublicProgramUrl).mockReturnValue(null);
    vi.mocked(getProgramBySlug).mockReturnValue(undefined);
    vi.mocked(listPrograms).mockResolvedValue({ elements: [], paging: {} });
  });

  it('preserves a valid org-scoped program URL and adds the course selector', async () => {
    vi.mocked(listPrograms).mockResolvedValue({
      elements: [
        {
          id: 'program-1',
          name: 'Workforce Advancement Project',
          slug: 'workforce-advancement-project-8a3f0',
          url: 'https://www.coursera.org/programs/workforce-advancement-project-8a3f0',
        },
      ],
      paging: {},
    } as never);

    const resolved = await getOrgScopedCourseUrl(
      'it-support-professional-certificate-ibm',
      'course-id-1',
      'technical-support-fundamentals',
    );

    const url = new URL(resolved);
    expect(url.pathname).toBe('/programs/workforce-advancement-project-8a3f0');
    expect(url.searchParams.get('productId')).toBe('course-id-1');
    expect(url.searchParams.get('productType')).toBe('course');
    expect(url.searchParams.get('showMiniModal')).toBe('true');
  });

  it('falls back to the public course page when the course id is missing', async () => {
    vi.mocked(listPrograms).mockResolvedValue({
      elements: [
        {
          id: 'program-1',
          name: 'Workforce Advancement Project',
          slug: 'workforce-advancement-project-8a3f0',
          url: 'https://www.coursera.org/programs/workforce-advancement-project-8a3f0',
        },
      ],
      paging: {},
    } as never);

    const resolved = await getOrgScopedCourseUrl(
      'it-support-professional-certificate-ibm',
      '',
      'technical-support-fundamentals',
    );

    expect(resolved).toBe('https://www.coursera.org/learn/technical-support-fundamentals');
  });

  it('falls back to the public course page when B4B has no program URL', async () => {
    const resolved = await getOrgScopedCourseUrl(
      'it-support-professional-certificate-ibm',
      'course-id-1',
      'technical-support-fundamentals',
    );

    expect(resolved).toBe('https://www.coursera.org/learn/technical-support-fundamentals');
  });

  it('falls back to the public course page when the configured URL is the Coursera root', async () => {
    vi.mocked(resolveCourseraPublicProgramUrl).mockReturnValue('https://www.coursera.org/');

    const resolved = await getOrgScopedCourseUrl(
      'it-support-professional-certificate-ibm',
      'course-id-1',
      'technical-support-fundamentals',
    );

    expect(resolved).toBe('https://www.coursera.org/learn/technical-support-fundamentals');
  });

  it('falls back to the public course page when program resolution throws', async () => {
    vi.mocked(resolveCourseraPublicProgramUrl).mockImplementation(() => {
      throw new Error('resolver unavailable');
    });

    const resolved = await getOrgScopedCourseUrl(
      'it-support-professional-certificate-ibm',
      'course-id-1',
      'technical-support-fundamentals',
    );

    expect(resolved).toBe('https://www.coursera.org/learn/technical-support-fundamentals');
  });
});
