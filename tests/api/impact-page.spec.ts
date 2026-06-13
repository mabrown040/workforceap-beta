import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// ─── Mocks ───
vi.mock('server-only', () => ({}));

vi.mock('@/lib/db/optionalBuildDb', () => ({
  shouldSkipOptionalDbQueriesAtBuild: vi.fn(() => false),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    employer: {
      count: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
    placementRecord: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    courseProgress: {
      findMany: vi.fn(),
    },
  },
}));

// ─── Imports after mocks ───
import {
  getPublicImpactStats,
  EMPTY_PUBLIC_IMPACT_STATS,
  buildPublishedImpactJsonLdStats,
  hasPublicImpactEnrolledCohort,
  hasPublicImpactLiveData,
  type PublicImpactStats,
} from '@/lib/marketing/publicImpactStats';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';

const ORG_ID = 'org-test-123';

function makeEnrolledUser(overrides: {
  id: string;
  programSlug: string;
  avgPercent: number;
  coursesCompleted: number;
  hasPlacement?: boolean;
  enrolledAt?: Date;
  createdAt?: Date;
  lastUpdatedAt?: Date;
}) {
  return {
    id: overrides.id,
    enrolledProgram: overrides.programSlug,
    enrolledAt: overrides.enrolledAt ?? new Date('2024-01-01'),
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
    coursesCompleted: [],
    memberProgramProgress: [
      {
        programSlug: overrides.programSlug,
        averagePercent: overrides.avgPercent,
        coursesCompleted: overrides.coursesCompleted,
        lastUpdatedAt: overrides.lastUpdatedAt ?? new Date('2024-03-01'),
      },
    ],
    placementRecord: overrides.hasPlacement ? { id: `placement-${overrides.id}` } : null,
  };
}

describe('Impact Page — getPublicImpactStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (shouldSkipOptionalDbQueriesAtBuild as any).mockReturnValue(false);
  });

  describe('public impact presentation helpers', () => {
    it('hasPublicImpactLiveData is false for empty stats', () => {
      expect(hasPublicImpactLiveData(EMPTY_PUBLIC_IMPACT_STATS)).toBe(false);
    });

    it('hasPublicImpactLiveData is true when any core metric is recorded', () => {
      expect(hasPublicImpactLiveData({ ...EMPTY_PUBLIC_IMPACT_STATS, membersServed: 1 })).toBe(true);
      expect(hasPublicImpactLiveData({ ...EMPTY_PUBLIC_IMPACT_STATS, employersPartnered: 2 })).toBe(true);
    });

    it('hasPublicImpactEnrolledCohort follows program rows', () => {
      expect(hasPublicImpactEnrolledCohort(EMPTY_PUBLIC_IMPACT_STATS)).toBe(false);
      expect(
        hasPublicImpactEnrolledCohort({
          ...EMPTY_PUBLIC_IMPACT_STATS,
          programs: [
            {
              programSlug: 'digital-literacy-empowerment-class',
              programTitle: 'Digital Literacy',
              enrolled: 1,
              completed: 0,
              avgDaysToComplete: null,
            },
          ],
        }),
      ).toBe(true);
    });

    it('buildPublishedImpactJsonLdStats omits unpublished 0% rates and empty metrics', () => {
      const labels = {
        membersServed: 'Members served',
        completionRate: 'Completion rate',
        placementRate: 'Placement rate',
        avgSalaryIncrease: 'Avg. salary increase',
        employerPartners: 'Employer partners',
        jobsPosted: 'Jobs posted',
        hires: 'Hires',
      };

      expect(buildPublishedImpactJsonLdStats(EMPTY_PUBLIC_IMPACT_STATS, labels)).toEqual([]);

      expect(
        buildPublishedImpactJsonLdStats(
          {
            ...EMPTY_PUBLIC_IMPACT_STATS,
            membersServed: 12,
            completionRatePct: 0,
            placementRatePct: 0,
          },
          labels,
        ),
      ).toEqual([{ label: 'Members served', value: '12' }]);

      expect(
        buildPublishedImpactJsonLdStats(
          {
            ...EMPTY_PUBLIC_IMPACT_STATS,
            membersServed: 8,
            completionRatePct: 40,
            placementRatePct: 25,
            programs: [
              {
                programSlug: 'digital-literacy-empowerment-class',
                programTitle: 'Digital Literacy',
                enrolled: 5,
                completed: 2,
                avgDaysToComplete: 30,
              },
            ],
            salaryIncreaseSampleSize: 2,
            avgSalaryIncreaseDollars: 12500,
            employersPartnered: 3,
            jobsPosted: 10,
            hiresMade: 4,
          },
          labels,
        ),
      ).toEqual([
        { label: 'Members served', value: '8' },
        { label: 'Completion rate', value: '40%' },
        { label: 'Placement rate', value: '25%' },
        { label: 'Avg. salary increase', value: '+$12,500' },
        { label: 'Employer partners', value: '3' },
        { label: 'Jobs posted', value: '10' },
        { label: 'Hires', value: '4' },
      ]);
    });
  });

  describe('live stats shape', () => {
    it('returns all expected public impact stat fields', async () => {
      (prisma.user.count as any).mockResolvedValue(10);
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.employer.count as any).mockResolvedValue(5);
      (prisma.job.count as any).mockResolvedValue(20);
      (prisma.placementRecord.count as any).mockResolvedValue(3);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);

      expect(stats).toMatchObject<Partial<PublicImpactStats>>({
        membersServed: expect.any(Number),
        completionRatePct: expect.any(Number),
        placementRatePct: expect.any(Number),
        avgSalaryIncreaseDollars: expect.toBeOneOf([expect.any(Number), null]),
        salaryIncreaseSampleSize: expect.any(Number),
        programs: expect.any(Array),
        employersPartnered: expect.any(Number),
        jobsPosted: expect.any(Number),
        hiresMade: expect.any(Number),
        asOfLabel: expect.any(String),
      });
    });

    it('includes members served, completers, placements, and avg wage', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
        makeEnrolledUser({ id: 'u2', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
        makeEnrolledUser({ id: 'u3', programSlug: 'it-support-professional-certificate-ibm', avgPercent: 50, coursesCompleted: 3, hasPlacement: false }),
      ];

      (prisma.user.count as any).mockResolvedValue(5); // 2 non-enrolled + 3 enrolled
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(4);
      (prisma.job.count as any).mockResolvedValue(12);
      (prisma.placementRecord.count as any).mockResolvedValue(2);
      (prisma.placementRecord.findMany as any).mockResolvedValue([
        { salaryOffered: 40000, wageAtFollowUp: 55000 },
        { salaryOffered: 50000, wageAtFollowUp: 65000 },
      ]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);

      expect(stats.membersServed).toBe(5);
      expect(stats.completionRatePct).toBe(67); // 2 of 3 enrolled completed
      expect(stats.placementRatePct).toBe(67); // 2 of 3 enrolled placed
      expect(stats.avgSalaryIncreaseDollars).toBe(15000);
      expect(stats.salaryIncreaseSampleSize).toBe(2);
      expect(stats.hiresMade).toBe(2);
      expect(stats.employersPartnered).toBe(4);
      expect(stats.jobsPosted).toBe(12);
    });
  });

  describe('data accuracy', () => {
    it('membersServed matches prisma.user.count with member-only filter', async () => {
      (prisma.user.count as any).mockResolvedValue(42);
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(0);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats.membersServed).toBe(42);

      const countCall = (prisma.user.count as any).mock.calls[0][0];
      expect(countCall.where).toMatchObject({
        organizationId: ORG_ID,
        deletedAt: null,
        profile: { role: 'member' },
        email: { notIn: ['member.success@workforceap.org', 'mbrown@hsconglomerates.com'] },
      });
    });

    it('placement count matches prisma.placementRecord.count', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
        makeEnrolledUser({ id: 'u2', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: false }),
      ];

      (prisma.user.count as any).mockResolvedValue(2);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(1);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats.hiresMade).toBe(1);
      expect(stats.placementRatePct).toBe(50);
    });

    it('avg wage calculation is correct', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
      ];

      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(1);
      (prisma.placementRecord.findMany as any).mockResolvedValue([
        { salaryOffered: 38000, wageAtFollowUp: 52000 },
        { salaryOffered: 45000, wageAtFollowUp: 60000 },
        { salaryOffered: 50000, wageAtFollowUp: 50000 }, // zero increase
      ]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      // (14000 + 15000 + 0) / 3 = 9666.666...
      expect(stats.avgSalaryIncreaseDollars).toBeCloseTo(9666.67, 1);
      expect(stats.salaryIncreaseSampleSize).toBe(3);
    });

    it('program rows aggregate enrolled and completed correctly', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: false }),
        makeEnrolledUser({ id: 'u2', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: false }),
        makeEnrolledUser({ id: 'u3', programSlug: 'digital-literacy-empowerment-class', avgPercent: 50, coursesCompleted: 3, hasPlacement: false }),
        makeEnrolledUser({ id: 'u4', programSlug: 'it-support-professional-certificate-ibm', avgPercent: 100, coursesCompleted: 7, hasPlacement: false }),
      ];

      (prisma.user.count as any).mockResolvedValue(4);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(0);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);

      const dlProgram = stats.programs.find((p) => p.programSlug === 'digital-literacy-empowerment-class');
      const itProgram = stats.programs.find((p) => p.programSlug === 'it-support-professional-certificate-ibm');

      expect(dlProgram).toBeDefined();
      expect(dlProgram!.enrolled).toBe(3);
      expect(dlProgram!.completed).toBe(2);

      expect(itProgram).toBeDefined();
      expect(itProgram!.enrolled).toBe(1);
      expect(itProgram!.completed).toBe(1);
    });

    it('completion rate is 0 when no enrolled members', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(0);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats.completionRatePct).toBe(0);
      expect(stats.placementRatePct).toBe(0);
    });
  });

  describe('cache behavior', () => {
    it('page exports revalidate = 600 (10 minutes)', () => {
      // Since the impact page is a Server Component with no separate API route,
      // we verify the ISR revalidate constant directly from source.
      const pagePath = path.resolve(__dirname, '../../app/impact/page.tsx');
      const source = readFileSync(pagePath, 'utf-8');
      const match = source.match(/export\s+const\s+revalidate\s+=\s+(\d+)/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBe(600);
    });

    it('uses data-light copy when live metrics are unavailable', () => {
      const pagePath = path.resolve(__dirname, '../../app/impact/page.tsx');
      const source = readFileSync(pagePath, 'utf-8');
      expect(source).toContain("hasLiveData ? t('eyebrow') : t('eyebrowDataLight')");
      expect(source).toContain("hasLiveData ? t('subtitle') : t('subtitleDataLight')");
      expect(source).toContain("hasLiveData ? t('description') : t('descriptionDataLight')");
      expect(source).toContain("hasLiveData ? t('programsSubtitle') : t('programsSubtitleDataLight')");
      expect(source).toContain("hasLiveData && hasEmployerMetrics ? t('employersSubtitle') : t('employersSubtitleDataLight')");
      expect(source).toContain("t('membersServedEmptyDesc')");
      expect(source).toContain("hasLiveData ? t('statsMethodologyNote') : t('dataLightNote')");
      expect(source).toContain('impact-page__stats-grid--preview');
      expect(source).not.toContain('impact-page__data-light-note');
      expect(source).toContain("variant={hasLiveData ? 'dark' : 'default'}");
    });

    it('produces deterministic results for identical inputs', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
      ];

      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(3);
      (prisma.job.count as any).mockResolvedValue(8);
      (prisma.placementRecord.count as any).mockResolvedValue(1);
      (prisma.placementRecord.findMany as any).mockResolvedValue([{ salaryOffered: 40000, wageAtFollowUp: 60000 }]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const first = await getPublicImpactStats(ORG_ID);
      const second = await getPublicImpactStats(ORG_ID);

      expect(first.membersServed).toBe(second.membersServed);
      expect(first.completionRatePct).toBe(second.completionRatePct);
      expect(first.placementRatePct).toBe(second.placementRatePct);
      expect(first.avgSalaryIncreaseDollars).toBe(second.avgSalaryIncreaseDollars);
      expect(first.hiresMade).toBe(second.hiresMade);
    });
  });

  describe('edge cases', () => {
    it('returns empty stats in build mode', async () => {
      (shouldSkipOptionalDbQueriesAtBuild as any).mockReturnValue(true);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats).toEqual({
        ...EMPTY_PUBLIC_IMPACT_STATS,
        asOfLabel: 'Build mode',
      });

      // Prisma should not be called in build mode
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('returns empty stats when prisma throws', async () => {
      (prisma.user.count as any).mockRejectedValue(new Error('DB down'));

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats).toEqual(EMPTY_PUBLIC_IMPACT_STATS);
    });

    it('handles members with no enrolled program', async () => {
      // user.count returns all active members; findMany filters to enrolled only
      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(0);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats.membersServed).toBe(1);
      expect(stats.completionRatePct).toBe(0);
      expect(stats.placementRatePct).toBe(0);
      expect(stats.programs).toHaveLength(0);
    });

    it('avgSalaryIncreaseDollars is null when no paired salary data', async () => {
      const enrolled = [
        makeEnrolledUser({ id: 'u1', programSlug: 'digital-literacy-empowerment-class', avgPercent: 100, coursesCompleted: 6, hasPlacement: true }),
      ];

      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(1);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([]);

      const stats = await getPublicImpactStats(ORG_ID);
      expect(stats.avgSalaryIncreaseDollars).toBeNull();
      expect(stats.salaryIncreaseSampleSize).toBe(0);
    });

    it('computes avgDaysToComplete when course progress timestamps exist', async () => {
      const enrolledAt = new Date('2024-01-01');
      const completedAt = new Date('2024-01-31');

      const enrolled = [
        makeEnrolledUser({
          id: 'u1',
          programSlug: 'digital-literacy-empowerment-class',
          avgPercent: 100,
          coursesCompleted: 6,
          hasPlacement: false,
          enrolledAt,
          lastUpdatedAt: completedAt,
        }),
      ];

      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.user.findMany as any).mockResolvedValue(enrolled);
      (prisma.employer.count as any).mockResolvedValue(0);
      (prisma.job.count as any).mockResolvedValue(0);
      (prisma.placementRecord.count as any).mockResolvedValue(0);
      (prisma.placementRecord.findMany as any).mockResolvedValue([]);
      (prisma.courseProgress.findMany as any).mockResolvedValue([
        { userId: 'u1', programSlug: 'digital-literacy-empowerment-class', completedAt },
      ]);

      const stats = await getPublicImpactStats(ORG_ID);
      const program = stats.programs.find((p) => p.programSlug === 'digital-literacy-empowerment-class');
      expect(program).toBeDefined();
      expect(program!.avgDaysToComplete).toBeCloseTo(30, 0);
    });
  });
});
