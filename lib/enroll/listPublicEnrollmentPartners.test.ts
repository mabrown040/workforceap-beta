import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partner: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn((slug: string) =>
    slug === 'cybersecurity-professional-certificate-google'
      ? { slug, title: 'Cybersecurity' }
      : null,
  ),
}));

import { prisma } from '@/lib/db/prisma';
import { listPublicEnrollmentPartners } from '@/lib/enroll/resolveEnrollmentPartner';

describe('listPublicEnrollmentPartners', () => {
  beforeEach(() => {
    vi.mocked(prisma.partner.findMany).mockReset();
  });

  it('returns only active enrollment pages with a known program catalog', async () => {
    vi.mocked(prisma.partner.findMany).mockResolvedValue([
      {
        name: 'Concordia High School',
        slug: 'concordia-high-school',
        schoolDistrict: 'Demo ISD',
        programCatalog: [{ programSlug: 'cybersecurity-professional-certificate-google' }],
      },
      {
        name: 'Empty Catalog HS',
        slug: 'empty-hs',
        schoolDistrict: null,
        programCatalog: [{ programSlug: 'not-a-real-program' }],
      },
    ] as never);

    const links = await listPublicEnrollmentPartners();
    expect(links).toEqual([
      {
        name: 'Concordia High School',
        slug: 'concordia-high-school',
        enrollmentPath: '/enroll/concordia',
        schoolDistrict: 'Demo ISD',
      },
    ]);
  });
});
