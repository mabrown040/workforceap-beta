import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/coursera/canonicalMapping', () => ({
  findCanonicalMappingForCourseraCourse: vi.fn(),
}));
vi.mock('@/lib/content/courseraDiscoveredCatalog', () => ({
  DISCOVERED_COURSERA_PROGRAMS: {},
}));
vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(() => ({
    slug: 'comptia-a-professional-certificate',
    title: 'CompTIA A+',
    courses: [
      { slug: 'technical-support-fundamentals', name: 'Technical Support Fundamentals' },
    ],
  })),
}));
vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: vi.fn(async () => ({
    courses: [
      {
        slug: 'technical-support-fundamentals',
        name: 'Technical Support Fundamentals',
        estimatedHours: 10,
        courseraCourseId: 'coursera-course-1',
      },
    ],
  })),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ select }: { select: Record<string, boolean> }) =>
        select.organizationId
          ? { organizationId: 'org-1' }
          : { coursesCompleted: [] }),
      update: vi.fn(),
    },
    courseProgress: {
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      findMany: vi.fn(async () => [
        {
          status: 'IN_PROGRESS',
          percentComplete: 40,
          courseSlug: 'technical-support-fundamentals',
          courseId: 'coursera-course-1',
        },
      ]),
    },
    memberProgramProgress: { upsert: vi.fn(async () => ({})) },
  },
}));

import { findCanonicalMappingForCourseraCourse } from '@/lib/coursera/canonicalMapping';
import { prisma } from '@/lib/db/prisma';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';

describe('xAPI canonical progress without enrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findCanonicalMappingForCourseraCourse).mockResolvedValue({
      programSlug: 'comptia-a-plus',
      courseSlug: 'technical-support-fundamentals',
    });
  });

  it('writes a canonical in-progress row from an exact course id with no enrollment', async () => {
    const result = await upsertCourseProgressFromXapiStatement({
      userId: 'user-1',
      enrolledProgramSlug: null,
      parsed: {
        email: 'learner@example.com',
        statementId: 'statement-progress-1',
        verbId: 'http://adlnet.gov/expapi/verbs/progressed',
        courseraCourseId: 'coursera-course-1',
        activityType: 'course',
        resultProgressPercent: 40,
        rawStatement: {},
      },
    });

    expect(prisma.courseProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_programSlug_courseSlug: {
            userId: 'user-1',
            programSlug: 'comptia-a-professional-certificate',
            courseSlug: 'technical-support-fundamentals',
          },
        },
        create: expect.objectContaining({
          status: 'IN_PROGRESS',
          percentComplete: 40,
          courseId: 'coursera-course-1',
        }),
      }),
    );
    expect(result).toEqual({
      programSlug: 'comptia-a-professional-certificate',
      courseSlug: 'technical-support-fundamentals',
      courseName: 'Technical Support Fundamentals',
      courseraCourseId: 'coursera-course-1',
      trainingStartedTransition: true,
    });
    expect(prisma.courseProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          programSlug: {
            in: expect.arrayContaining([
              'comptia-a-professional-certificate',
              'comptia-a-plus',
            ]),
          },
        },
      }),
    );
  });
});
