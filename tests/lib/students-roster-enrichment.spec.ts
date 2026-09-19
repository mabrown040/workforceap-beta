import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  loadValidatedProgramCourses: vi.fn(),
}));

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
  loadValidatedProgramCourses: mocks.loadValidatedProgramCourses,
}));

vi.mock('@/lib/member/curriculumAssignment', () => ({
  getProgramCoursesForCurriculumVersion: vi.fn(() => [
    { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
    { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
  ]),
}));

const validatedCourses = {
    courses: [
      { slug: 'course-1', name: 'Course 1', estimatedHours: 10, courseraCourseId: 'id-1' },
      { slug: 'course-2', name: 'Course 2', estimatedHours: 10, courseraCourseId: 'id-2' },
    ],
};

import { loadStudentRosterEnrichment } from '@/lib/admin/studentsRosterEnrichment';

describe('loadStudentRosterEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadValidatedProgramCourses.mockResolvedValue(validatedCourses);
    mocks.queryRaw.mockResolvedValue([
      {
        userId: 'member-1',
        organizationId: 'org-1',
        enrolledProgram: null,
        enrollments: [{ programSlug: 'comptia-a-plus', curriculumVersion: '2026-approved-v2', isPrimary: true }],
        courseGrade: '93%',
        courseraActivityAt: new Date('2026-08-29T12:00:00.000Z'),
        courseActivityAt: null,
        hasLearningEvidence: true,
        courseFacts: [
          {
            programSlug: 'comptia-a-professional-certificate',
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
    expect(row.assignmentSource).toBe('enrollment');
    expect(row.averagePercent).toBe(50);
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledWith({
      organizationId: 'org-1',
      programSlug: 'comptia-a-professional-certificate',
      curriculumVersion: '2026-approved-v2',
      checkB4BContents: false,
    });
  });

  it('uses the primary assignment despite a stale legacy pointer and newer unrelated course facts', async () => {
    const baseline = (await mocks.queryRaw())[0];
    mocks.queryRaw.mockResolvedValue([{
      ...baseline,
      enrolledProgram: 'other-program',
      courseFacts: [
        { ...baseline.courseFacts[0], programSlug: 'other-program', percentComplete: 100, courseSlug: 'course-2', courseId: 'id-2' },
        ...baseline.courseFacts,
      ],
    }]);
    const [row] = await loadStudentRosterEnrichment({ organizationId: 'org-1', superAdmin: false, userIds: ['member-1'] });
    expect(row.programSlug).toBe('comptia-a-professional-certificate');
    expect(row.averagePercent).toBe(50);
  });

  it('keeps unassigned learning visible without manufacturing a program or progress denominator', async () => {
    const baseline = (await mocks.queryRaw())[0];
    mocks.queryRaw.mockResolvedValue([{ ...baseline, enrollments: [], courseGrade: null }]);
    const [row] = await loadStudentRosterEnrichment({ organizationId: 'org-1', superAdmin: false, userIds: ['member-1'] });
    expect(row).toMatchObject({ programSlug: null, assignmentSource: 'unassigned', averagePercent: null, hasLearningEvidence: true, courseGrade: null });
    expect(row.courseraActivityAt).toEqual(baseline.courseraActivityAt);
    expect(mocks.loadValidatedProgramCourses).not.toHaveBeenCalled();
  });

  it('does not give ambiguous enrollments an arbitrary legacy curriculum', async () => {
    const baseline = (await mocks.queryRaw())[0];
    mocks.queryRaw.mockResolvedValue([{
      ...baseline,
      enrolledProgram: 'other-program',
      enrollments: [{ ...baseline.enrollments[0], isPrimary: false }],
    }]);
    const [row] = await loadStudentRosterEnrichment({ organizationId: 'org-1', superAdmin: false, userIds: ['member-1'] });
    expect(row).toMatchObject({ programSlug: null, assignmentSource: 'unresolved', averagePercent: null });
    expect(mocks.loadValidatedProgramCourses).not.toHaveBeenCalled();
  });

  it('shares one pinned-curriculum lookup for members in the same organization', async () => {
    const baseline = (await mocks.queryRaw())[0];
    mocks.queryRaw.mockResolvedValue([baseline, { ...baseline, userId: 'member-2' }]);
    await loadStudentRosterEnrichment({ organizationId: 'org-1', superAdmin: false, userIds: ['member-1', 'member-2'] });
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledTimes(1);
  });

  it('does not share course denominators across curriculum versions or organizations', async () => {
    const baseline = (await mocks.queryRaw())[0];
    mocks.queryRaw.mockResolvedValue([
      baseline,
      { ...baseline, userId: 'member-legacy', enrollments: [{ ...baseline.enrollments[0], curriculumVersion: 'legacy-v1' }] },
      { ...baseline, userId: 'member-other-org', organizationId: 'org-2' },
    ]);
    mocks.loadValidatedProgramCourses.mockImplementation(async ({ organizationId, curriculumVersion }) => ({
      courses: organizationId === 'org-2'
        ? [...validatedCourses.courses, { slug: 'course-3', name: 'Course 3', estimatedHours: 10, courseraCourseId: 'id-3' }]
        : curriculumVersion === 'legacy-v1' ? validatedCourses.courses.slice(0, 1) : validatedCourses.courses,
    }));

    const rows = await loadStudentRosterEnrichment({ organizationId: 'org-1', superAdmin: true, userIds: ['member-1', 'member-legacy', 'member-other-org'] });

    expect(rows.map((row) => [row.userId, row.averagePercent])).toEqual([
      ['member-1', 50], ['member-legacy', 100], ['member-other-org', 33],
    ]);
    expect(mocks.loadValidatedProgramCourses).toHaveBeenCalledTimes(3);
  });
});
