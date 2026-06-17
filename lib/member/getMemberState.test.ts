import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({
  getCacheOrFetch: async (_key: string, fetcher: () => Promise<unknown>) => fetcher(),
  invalidateCache: vi.fn(),
}));

vi.mock('@/lib/member/memberEngagementSignals', () => ({
  getMemberEngagementSignals: vi.fn().mockResolvedValue({
    hasResume: false,
    jobApplicationCount: 0,
    counselorUnreadCount: 0,
    weeklyRecapUnopened: false,
    lastLoginAt: null,
  }),
}));

vi.mock('@/lib/member/getMemberResumePlainText', () => ({
  getMemberResumePlainText: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/member/memberProgramTrainingView', () => ({
  loadMemberProgramTrainingView: vi.fn().mockResolvedValue({
    completedCount: 1,
    hasStartedTraining: true,
    hasCompletedFirstCourse: true,
    allCoursesComplete: false,
    nextIncompleteCourseName: 'Interview prep',
  }),
}));

const { findUser, findAiToolResult, findMemberEvent, prismaMock } = vi.hoisted(() => {
  const findUser = vi.fn();
  const findAiToolResult = vi.fn();
  const findMemberEvent = vi.fn();
  const prismaMock = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      user: { findUnique: findUser },
      aIToolResult: { findFirst: findAiToolResult },
      memberEvent: { findFirst: findMemberEvent },
    })),
  };
  return { findUser, findAiToolResult, findMemberEvent, prismaMock };
});

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

import { getMemberState } from './getMemberState';

const userRecord = {
  id: 'member-1',
  email: 'member@example.com',
  fullName: 'Member One',
  enrolledProgram: 'google-it-support',
  enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
  assessmentCompleted: true,
  assessmentCompletedAt: new Date('2026-01-02T00:00:00.000Z'),
  careerRecommendationJson: null,
  programInterest: null,
  interviewEligible: false,
  interviewRequestedAt: null,
  interviewCompletedAt: null,
  onboardingCompletedAt: null,
  tourCompletedAt: null,
  needsComputerSupportFollowUp: false,
  workspaceEmail: null,
  workspaceEmailProvisioned: false,
  preScreeningResponse: null,
  profile: null,
  applications: [
    {
      status: 'approved',
      programInterest: 'google-it-support',
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  _count: { jobApplications: 0 },
};

describe('getMemberState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUser.mockResolvedValue(userRecord);
    findAiToolResult.mockResolvedValue(null);
    findMemberEvent.mockResolvedValue(null);
  });

  it('returns hasCompletedInterviewPractice=false when the completion event is absent', async () => {
    const state = await getMemberState('member-1');

    expect(state.hasCompletedInterviewPractice).toBe(false);
    expect(state.nextBestActions.some((action) => action.id === 'interview_practice')).toBe(true);
    expect(findMemberEvent).toHaveBeenCalledWith({
      where: { userId: 'member-1', eventName: 'career_os.interview_practice_completed' },
      select: { id: true },
    });
  });

  it('returns hasCompletedInterviewPractice=true when the completion event exists', async () => {
    findMemberEvent.mockResolvedValue({ id: 'event-1' });

    const state = await getMemberState('member-1');

    expect(state.hasCompletedInterviewPractice).toBe(true);
    expect(state.nextBestActions.some((action) => action.id === 'interview_practice')).toBe(false);
    expect(findMemberEvent).toHaveBeenCalledTimes(1);
  });
});
