import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  getProgramBySlug: vi.fn(),
  loadValidatedProgramCourses: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    courseProgress: { findMany: mocks.findMany },
    memberProgramProgress: { findFirst: mocks.findFirst },
  },
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: mocks.getProgramBySlug,
}));

vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: mocks.loadValidatedProgramCourses,
}));

import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';

describe('loadMemberProgramTrainingView canonical reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({
      organizationId: 'org-1',
      courseEnrollments: [],
    });
    mocks.getProgramBySlug.mockImplementation((slug: string) => {
      if (slug === 'data-analytics-professional-certificate-google') {
        return {
          slug,
          title: 'Management Analyst & Business Intelligence',
          courses: [
            { slug: 'management-1', name: 'Management 1', estimatedHours: 10, courseraCourseId: 'management-id-1' },
            { slug: 'management-2', name: 'Management 2', estimatedHours: 10, courseraCourseId: 'management-id-2' },
          ],
        };
      }

      return {
        slug: 'comptia-a-professional-certificate',
        title: 'CompTIA A+',
        courses: [
          { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
          { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
        ],
      };
    });
    mocks.loadValidatedProgramCourses.mockImplementation(async ({ programSlug }: { programSlug: string }) => ({
      courses: programSlug === 'data-analytics-professional-certificate-google'
        ? [
            { slug: 'management-1', name: 'Management 1', estimatedHours: 10, courseraCourseId: 'management-id-1' },
            { slug: 'management-2', name: 'Management 2', estimatedHours: 10, courseraCourseId: 'management-id-2' },
          ]
        : [
            { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
            { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
          ],
    }));
    mocks.findFirst.mockResolvedValue(null);
    mocks.findMany.mockResolvedValue([
      {
        programSlug: 'comptia-a-plus',
        courseSlug: 'course-1',
        courseId: 'id-1',
        status: 'COMPLETED',
        percentComplete: 100,
        scoreScaled: null,
        lastActivityAt: new Date('2026-08-29T12:00:00.000Z'),
        lastUpdatedAt: new Date('2026-08-29T12:00:00.000Z'),
      },
    ]);
  });

  it('finds legacy alias rows when enrollment already uses the canonical slug', async () => {
    const result = await loadMemberProgramTrainingView({
      userId: 'member-1',
      programSlug: 'comptia-a-professional-certificate',
      readOnlyAudit: true,
    });

    const queriedSlugs = mocks.findMany.mock.calls[0]?.[0]?.where?.programSlug?.in as string[];
    expect(queriedSlugs).toContain('comptia-a-professional-certificate');
    expect(queriedSlugs).toContain('comptia-a-plus');
    expect(result?.completedCount).toBe(1);
    expect(result?.totalCourses).toBe(2);
    expect(result?.progressPercentDisplay).toBe(50);
    expect(result?.allCoursesComplete).toBe(false);
  });

  it('uses the primary CourseEnrollment when User.enrolledProgram is stale', async () => {
    mocks.userFindUnique.mockResolvedValue({
      organizationId: 'org-1',
      courseEnrollments: [
        {
          programSlug: 'data-analytics-professional-certificate-google',
          curriculumVersion: '2026-approved-v2',
          isPrimary: true,
        },
      ],
    });
    mocks.findMany.mockResolvedValue([
      {
        programSlug: 'data-analytics-professional-certificate-google',
        courseSlug: 'management-1',
        courseId: 'management-id-1',
        status: 'COMPLETED',
        percentComplete: 100,
        scoreScaled: null,
        lastActivityAt: new Date('2026-08-29T12:00:00.000Z'),
        lastUpdatedAt: new Date('2026-08-29T12:00:00.000Z'),
      },
    ]);

    const result = await loadMemberProgramTrainingView({
      userId: 'member-stale-pointer',
      programSlug: 'comptia-a-professional-certificate',
      readOnlyAudit: true,
    });

    const enrollmentRead = mocks.userFindUnique.mock.calls[0]?.[0]?.select?.courseEnrollments;
    expect(enrollmentRead).not.toHaveProperty('where');
    expect(enrollmentRead).not.toHaveProperty('take');
    expect(mocks.getProgramBySlug).toHaveBeenCalledWith(
      'data-analytics-professional-certificate-google',
    );
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledWith(
      expect.objectContaining({
        programSlug: 'data-analytics-professional-certificate-google',
        curriculumVersion: '2026-approved-v2',
      }),
    );
    const queriedSlugs = mocks.findMany.mock.calls[0]?.[0]?.where?.programSlug?.in as string[];
    expect(queriedSlugs).toContain('data-analytics-professional-certificate-google');
    expect(result?.completedCount).toBe(1);
    expect(result?.totalCourses).toBe(2);
    expect(result?.progressPercentDisplay).toBe(50);
  });

  it('does not infer legacy when unrelated non-primary enrollment rows exist', async () => {
    mocks.userFindUnique.mockResolvedValue({
      organizationId: 'org-1',
      courseEnrollments: [
        {
          programSlug: 'data-analytics-professional-certificate-google',
          curriculumVersion: '2026-approved-v2',
          isPrimary: false,
        },
      ],
    });

    const result = await loadMemberProgramTrainingView({
      userId: 'member-ambiguous-assignment',
      programSlug: 'comptia-a-professional-certificate',
    });

    expect(result).toBeNull();
    expect(mocks.loadValidatedProgramCourses).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
