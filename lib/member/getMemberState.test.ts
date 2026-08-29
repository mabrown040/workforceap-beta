import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cache', () => ({
  getCacheOrFetch: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
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
    completedSlugsAuthoritative: ['course-1'],
    validatedCourseSlugs: ['course-1', 'course-2'],
    totalCourses: 2,
  }),
}));

const { findUser, findAiToolResult, findMemberEvent, findPlacementRecord, prismaMock } = vi.hoisted(() => {
  const findUser = vi.fn();
  const findAiToolResult = vi.fn();
  const findMemberEvent = vi.fn();
  const findPlacementRecord = vi.fn();
  const prismaMock = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      user: { findUnique: findUser },
      aIToolResult: { findFirst: findAiToolResult },
      memberEvent: { findFirst: findMemberEvent },
      placementRecord: { findUnique: findPlacementRecord },
    })),
  };
  return { findUser, findAiToolResult, findMemberEvent, findPlacementRecord, prismaMock };
});

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

import { getMemberState } from './getMemberState';
import { getCacheOrFetch } from '@/lib/cache';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';

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
    findPlacementRecord.mockResolvedValue(null);
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

  it('bypasses shared cache and resume storage during a read-only audit', async () => {
    const state = await getMemberState('member-1', { readOnlyAudit: true });

    expect(state.userId).toBe('member-1');
    expect(getCacheOrFetch).not.toHaveBeenCalled();
    expect(getMemberResumePlainText).not.toHaveBeenCalled();
  });

  it('returns hasCompletedInterviewPractice=true when the completion event exists', async () => {
    findMemberEvent.mockResolvedValue({ id: 'event-1' });

    const state = await getMemberState('member-1');

    expect(state.hasCompletedInterviewPractice).toBe(true);
    expect(state.nextBestActions.some((action) => action.id === 'interview_practice')).toBe(false);
    expect(findMemberEvent).toHaveBeenCalledTimes(1);
  });

  it('fetches the real PlacementRecord and surfaces the 90-day retention nudge instead of hardcoding nulls', async () => {
    const placedAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    findPlacementRecord.mockResolvedValue({
      placedAt,
      retentionDecision: null,
      retentionStatus: null,
    });

    const state = await getMemberState('member-1');

    expect(findPlacementRecord).toHaveBeenCalledWith({
      where: { userId: 'member-1' },
      select: { placedAt: true, retentionDecision: true, retentionStatus: true },
    });
    expect(state.nextBestActions.some((action) => action.id === 'placement_retention_window_90')).toBe(true);
  });

  it('surfaces the job-loss re-activation nudge when the placement is separated', async () => {
    findPlacementRecord.mockResolvedValue({
      placedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      retentionDecision: 'not_retained',
      retentionStatus: null,
    });

    const state = await getMemberState('member-1');

    expect(state.nextBestActions.some((action) => action.id === 'placement_job_loss_reactivate')).toBe(true);
  });
});
