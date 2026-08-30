import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  messageFindFirst: vi.fn(),
  fetchLearnerProgressFromB4B: vi.fn(),
  loadMemberProgramTrainingView: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    message: { findFirst: mocks.messageFindFirst },
  },
}));

vi.mock('@/lib/content/courseraDiscoveredCatalog', () => ({
  DISCOVERED_COURSERA_PROGRAMS: {
    'data-analytics-professional-certificate-google': {
      courseraProgramId: 'coursera-management-track',
    },
  },
}));

vi.mock('@/lib/coursera/learnerProgress', () => ({
  fetchLearnerProgressFromB4B: mocks.fetchLearnerProgressFromB4B,
}));

vi.mock('@/lib/member/memberEngagementSignals', () => ({
  getMemberEngagementSignals: vi.fn(async () => ({
    hasResume: true,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
    lastLoginAt: new Date(),
  })),
}));

vi.mock('@/lib/member/memberProgramTrainingView', () => ({
  loadMemberProgramTrainingView: mocks.loadMemberProgramTrainingView,
}));

import { calculateAtRiskScore } from '@/lib/member/atRiskScoring';

describe('at-risk curriculum assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageFindFirst.mockResolvedValue({ createdAt: new Date() });
    mocks.fetchLearnerProgressFromB4B.mockResolvedValue(new Map());
    mocks.loadMemberProgramTrainingView.mockResolvedValue({
      hasStartedTraining: true,
      allCoursesComplete: false,
      lastTrainingActivityAt: new Date(),
    });
  });

  it('fetches and scores the primary CourseEnrollment instead of a stale User pointer', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'member-1',
      email: 'member@example.com',
      enrolledProgram: 'stale-program-pointer',
      courseEnrollments: [
        {
          programSlug: 'data-analytics-professional-certificate-google',
          curriculumVersion: '2026-approved-v2',
          isPrimary: true,
        },
      ],
      assessmentCompleted: true,
      lastCourseraAutoSyncAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      profile: { resumeOriginalPath: 'resume.pdf', resumeEnhancedPath: null },
      _count: { jobApplications: 1 },
    });

    await calculateAtRiskScore('member-1');

    expect(mocks.fetchLearnerProgressFromB4B).toHaveBeenCalledWith(
      'member@example.com',
      { programId: 'coursera-management-track' },
    );
    expect(mocks.loadMemberProgramTrainingView).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'member-1',
        programSlug: 'data-analytics-professional-certificate-google',
      }),
    );
  });
});
