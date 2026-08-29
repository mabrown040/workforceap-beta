import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scopedFindFirst: vi.fn(),
  courseEnrollmentFindMany: vi.fn(),
  identityFindMany: vi.fn(),
  rawQuery: vi.fn(),
  courseProgressCount: vi.fn(),
  rawCourseCount: vi.fn(),
  rawBadgeCount: vi.fn(),
  canonicalMappingCount: vi.fn(),
  courseProgressFindMany: vi.fn(),
  rawCourseFindMany: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(async () => ({ id: 'admin-1' })),
}));
vi.mock('@/lib/tenant/adminPageScope', () => ({
  resolveAdminPageTenant: vi.fn(async () => ({
    ok: true,
    orgId: 'org-1',
    superAdmin: false,
  })),
  withAdminPageScope: vi.fn(async (
    _scope: unknown,
    callback: (db: { user: { findFirst: typeof mocks.scopedFindFirst } }) => Promise<unknown>,
  ) =>
    callback({ user: { findFirst: mocks.scopedFindFirst } }),
  ),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    courseEnrollment: { findMany: mocks.courseEnrollmentFindMany },
    courseraIdentityMapping: { findMany: mocks.identityFindMany },
    $queryRaw: mocks.rawQuery,
    courseProgress: {
      count: mocks.courseProgressCount,
      findMany: mocks.courseProgressFindMany,
    },
    courseraCourseProgress: {
      count: mocks.rawCourseCount,
      findMany: mocks.rawCourseFindMany,
    },
    courseraBadgeProgress: { count: mocks.rawBadgeCount },
    courseraCanonicalCourseMapping: { count: mocks.canonicalMappingCount },
  },
}));
vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: vi.fn(async () => ({ courses: [] })),
}));

import { diagnoseMemberCoursera } from '@/lib/admin/diagnoseMemberCoursera';

describe('diagnoseMemberCoursera tenant boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.courseEnrollmentFindMany.mockResolvedValue([]);
    mocks.identityFindMany.mockResolvedValue([]);
    mocks.rawQuery.mockResolvedValue([]);
    mocks.courseProgressCount.mockResolvedValue(0);
    mocks.rawCourseCount.mockResolvedValue(0);
    mocks.rawBadgeCount.mockResolvedValue(0);
    mocks.canonicalMappingCount.mockResolvedValue(0);
    mocks.courseProgressFindMany.mockResolvedValue([]);
    mocks.rawCourseFindMany.mockResolvedValue([]);
  });

  it('returns not found when the scoped admin client cannot see a foreign member', async () => {
    mocks.scopedFindFirst.mockResolvedValue(null);

    await expect(diagnoseMemberCoursera('foreign-member')).resolves.toEqual({
      ok: false,
      error: 'Member not found',
    });
    expect(mocks.courseEnrollmentFindMany).not.toHaveBeenCalled();
    expect(mocks.rawQuery).not.toHaveBeenCalled();
  });

  it('threads the authorized member organization through raw and xAPI reads', async () => {
    mocks.scopedFindFirst.mockResolvedValue({
      id: 'member-1',
      email: 'member@example.com',
      fullName: 'Member One',
      organizationId: 'org-1',
      enrolledProgram: null,
      courseraEnrollmentApproved: false,
    });

    const result = await diagnoseMemberCoursera('member-1');

    expect(result.ok).toBe(true);
    expect(mocks.courseEnrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'member-1', organizationId: 'org-1' },
      }),
    );
    expect(mocks.rawCourseCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
    expect(mocks.rawBadgeCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
    expect(mocks.rawCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
    expect(mocks.rawQuery).toHaveBeenCalledTimes(2);
    for (const call of mocks.rawQuery.mock.calls) {
      expect(call).toContain('org-1');
    }
  });
});
