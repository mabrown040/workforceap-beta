import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  loadValidatedProgramCourses: vi.fn(),
}));

vi.mock('@/lib/tenant/adminPageScope', () => ({
  withAdminPageScope: async (
    _scope: unknown,
    load: (db: { user: { findMany: typeof mocks.findMany } }) => unknown,
  ) => load({ user: { findMany: mocks.findMany } }),
}));

vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: mocks.loadValidatedProgramCourses,
}));

vi.mock('@/lib/admin/careerPlanSignal', () => ({
  deriveCareerPlanSignal: () => null,
}));

import { loadTrainingDashboardData } from '@/lib/admin/trainingDashboard';

function member(id: string, curriculumVersion: string) {
  return {
    id,
    organizationId: 'org-1',
    fullName: `Member ${id}`,
    email: `${id}@example.test`,
    phone: null,
    enrolledProgram: 'data-analytics-professional-certificate-google',
    enrolledAt: new Date('2026-08-01T00:00:00.000Z'),
    staleTrainingDetectedAt: null,
    careerRecommendationJson: null,
    applications: [],
    memberEvents: [],
    memberProgramProgress: [],
    courseEnrollments: [
      {
        programSlug: 'data-analytics-professional-certificate-google',
        curriculumVersion,
        isPrimary: true,
        enrolledAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    ],
    courseProgress: [],
    partnerReferrals: [],
    counselorAssignments: [],
  };
}

describe('training dashboard curriculum cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([
      member('legacy', 'legacy-v1'),
      member('approved', '2026-approved-v2'),
    ]);
    mocks.loadValidatedProgramCourses.mockImplementation(
      async ({ curriculumVersion }: { curriculumVersion: string }) => ({
        courses: Array.from(
          { length: curriculumVersion === '2026-approved-v2' ? 3 : 2 },
          (_, index) => ({
            slug: `${curriculumVersion}-course-${index}`,
            name: `Course ${index}`,
            estimatedHours: 1,
          }),
        ),
      }),
    );
  });

  it('loads separate denominators for two versions of the same program', async () => {
    const result = await loadTrainingDashboardData({
      orgId: 'org-1',
    } as Parameters<typeof loadTrainingDashboardData>[0]);

    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledTimes(2);
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledWith(
      expect.objectContaining({ curriculumVersion: 'legacy-v1' }),
    );
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledWith(
      expect.objectContaining({ curriculumVersion: '2026-approved-v2' }),
    );
    expect(result.rows.map((row) => row.totalCourses).sort()).toEqual([2, 3]);
  });
});
