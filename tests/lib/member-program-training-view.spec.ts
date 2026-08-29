import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(async () => ({ organizationId: 'org-1' })) },
    courseProgress: { findMany: mocks.findMany },
    memberProgramProgress: { findFirst: mocks.findFirst },
  },
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(() => ({
    slug: 'comptia-a-professional-certificate',
    title: 'CompTIA A+',
    courses: [
      { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
      { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
    ],
  })),
}));

vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: vi.fn(async () => ({
    courses: [
      { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
      { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
    ],
  })),
}));

import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';

describe('loadMemberProgramTrainingView canonical reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
