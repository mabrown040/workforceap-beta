import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  csvFindMany: vi.fn(),
  canonicalFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  fetchB4b: vi.fn(),
  getProgramUrl: vi.fn(),
  getCourseUrl: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    courseraCourseProgress: { findMany: mocks.csvFindMany },
    courseProgress: { findMany: mocks.canonicalFindMany },
    user: { findUnique: mocks.userFindUnique },
  },
}));
vi.mock('@/lib/coursera/learnerProgress', () => ({
  fetchLearnerProgressFromB4B: mocks.fetchB4b,
}));
vi.mock('@/lib/coursera/orgScopedUrls', () => ({
  getOrgScopedProgramUrl: mocks.getProgramUrl,
  getOrgScopedCourseUrl: mocks.getCourseUrl,
}));
vi.mock('@/lib/coursera/config', () => ({
  getCourseraConfig: () => ({ programHomeUrl: 'https://coursera.example/home' }),
}));
vi.mock('@/components/portal/CourseraProgressCardView', () => ({
  default: () => null,
}));

import CourseraProgressCard from './CourseraProgressCard';

describe('CourseraProgressCard read-only audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.csvFindMany.mockResolvedValue([]);
    mocks.canonicalFindMany.mockResolvedValue([]);
    mocks.userFindUnique.mockResolvedValue({ email: 'member@example.com' });
  });

  it('uses local rows without Coursera or shared-cache provider calls', async () => {
    await CourseraProgressCard({
      userId: 'member-1',
      programSlug: 'google-it-support',
      readOnlyAudit: true,
    });

    expect(mocks.fetchB4b).not.toHaveBeenCalled();
    expect(mocks.getProgramUrl).not.toHaveBeenCalled();
    expect(mocks.getCourseUrl).not.toHaveBeenCalled();
  });
});
