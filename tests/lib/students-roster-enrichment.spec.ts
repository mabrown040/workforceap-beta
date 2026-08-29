import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  crossTenantOK: (load: () => unknown) => load(),
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(() => ({
    slug: 'comptia-a-professional-certificate',
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

import { loadStudentRosterEnrichment } from '@/lib/admin/studentsRosterEnrichment';

describe('loadStudentRosterEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([
      {
        userId: 'member-1',
        organizationId: 'org-1',
        programSlug: 'comptia-a-plus',
        averagePercent: 100,
        courseGrade: '93%',
        lastActivityTime: new Date('2026-08-29T12:00:00.000Z'),
        courseFacts: [
          {
            courseSlug: 'course-1',
            courseId: 'id-1',
            percentComplete: 100,
            status: 'COMPLETED',
          },
        ],
      },
    ]);
  });

  it('canonicalizes alias rows and recomputes percent over the validated list', async () => {
    const [row] = await loadStudentRosterEnrichment({
      organizationId: 'org-1',
      superAdmin: false,
      userIds: ['member-1'],
    });

    expect(row.programSlug).toBe('comptia-a-professional-certificate');
    expect(row.averagePercent).toBe(50);
  });
});
