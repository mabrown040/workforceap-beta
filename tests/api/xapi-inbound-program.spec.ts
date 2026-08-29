import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn() }));
vi.mock('@/lib/member/courseCompletion', () => ({ completeMemberCourse: vi.fn() }));
vi.mock('@/lib/member/courseProgress', () => ({ upsertCourseProgressFromXapiStatement: vi.fn() }));
vi.mock('@/lib/coursera/programCourseList', () => ({
  loadValidatedProgramCourses: vi.fn(),
}));
vi.mock('@/lib/milestoneCascade/detectCompletionMilestone', () => ({
  detectTrainingMilestone: vi.fn(),
}));
vi.mock('@/lib/member/staffTrainingProgramFallback', () => ({ resolveStaffTrainingPreviewProgramSlug: vi.fn() }));
vi.mock('@/lib/member/dailyStudyPoints', () => ({ utcDateKey: vi.fn(() => '2026-08-29') }));
vi.mock('@/lib/member/points', () => ({ awardPoints: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/xapi/mappings', () => ({
  recordXapiEvent: vi.fn(),
  resolveXapiUser: vi.fn(),
}));
vi.mock('@/lib/xapi/statements', () => ({ isXapiCompletionVerb: vi.fn() }));
vi.mock('@/lib/xapi/storage', () => ({ markXapiStatementProcessed: vi.fn() }));

import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { completeMemberCourse } from '@/lib/member/courseCompletion';
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { awardPoints } from '@/lib/member/points';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { recordXapiEvent, resolveXapiUser } from '@/lib/xapi/mappings';
import { isXapiCompletionVerb } from '@/lib/xapi/statements';
import { markXapiStatementProcessed } from '@/lib/xapi/storage';
import { loadValidatedProgramCourses } from '@/lib/coursera/programCourseList';
import { detectTrainingMilestone } from '@/lib/milestoneCascade/detectCompletionMilestone';

describe('handleInboundParsedStatement program resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveXapiUser).mockResolvedValue({
      userId: 'member-1',
      email: 'member@example.com',
      fullName: 'Member One',
      mappingMethod: 'direct_email',
    });
    vi.mocked(awardPoints).mockResolvedValue({
      awarded: true,
      points: 1,
      total: 1,
      level: 'starter',
    });
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isXapiCompletionVerb).mockReturnValue(true);
    vi.mocked(completeMemberCourse).mockResolvedValue({
      ok: true,
      alreadyCompleted: false,
      courseSlug: 'course-one',
      courseName: 'Course One',
      programSlug: 'primary-program',
      completedCount: 1,
    });
    vi.mocked(recordXapiEvent).mockResolvedValue(undefined);
    vi.mocked(markXapiStatementProcessed).mockResolvedValue(undefined);
  });

  it('persists a linked course completion without enrollment instead of returning No program enrolled', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      enrolledProgram: 'stale-program',
      courseEnrollments: [
        { programSlug: 'historical-program', isPrimary: false },
      ],
    } as never);
    vi.mocked(completeMemberCourse).mockResolvedValueOnce({
      ok: true,
      alreadyCompleted: false,
      persistedWithoutProgram: true,
      courseSlug: 'course-one',
      courseName: 'Course One',
      programSlug: 'canonical-program',
      completedCount: 1,
    });

    const result = await handleInboundParsedStatement(
      {
        email: 'member@example.com',
        courseSlug: 'course-one',
        courseName: 'Course One',
        courseraCourseId: 'coursera-course-1',
        activityType: 'course',
        statementId: 'statement-1',
        verbId: 'http://adlnet.gov/expapi/verbs/completed',
        rawStatement: {},
      },
      { organizationId: 'org-1', statementHash: 'hash-1' },
    );

    expect(result.completions).toEqual([
      expect.objectContaining({ ok: true, persistedWithoutProgram: true }),
    ]);
    expect(upsertCourseProgressFromXapiStatement).toHaveBeenCalledWith({
      userId: 'member-1',
      enrolledProgramSlug: null,
      parsed: expect.objectContaining({ statementId: 'statement-1' }),
    });
    expect(completeMemberCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'member-1',
        resolvedProgramSlug: null,
        notify: false,
      }),
    );
    expect(vi.mocked(completeMemberCourse).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(upsertCourseProgressFromXapiStatement).mock.invocationCallOrder[0],
    );
    expect(recordXapiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        matchedUserId: 'member-1',
        completionStatus: 'completed',
      }),
    );
    expect(markXapiStatementProcessed).toHaveBeenCalledWith('statement-1', 'hash-1');
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it('threads the resolved primary program through one progress upsert and completion orchestration', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      enrolledProgram: 'legacy-program',
      courseEnrollments: [
        { programSlug: 'legacy-program', isPrimary: false },
        { programSlug: 'primary-program', isPrimary: true },
      ],
    } as never);

    await handleInboundParsedStatement(
      {
        email: 'member@example.com',
        courseSlug: 'course-one',
        courseName: 'Course One',
        statementId: 'statement-2',
        verbId: 'http://adlnet.gov/expapi/verbs/completed',
        rawStatement: {},
      },
      { organizationId: 'org-1', statementHash: 'hash-2' },
    );

    expect(upsertCourseProgressFromXapiStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'member-1',
        enrolledProgramSlug: 'primary-program',
      }),
    );
    expect(completeMemberCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'member-1',
        resolvedProgramSlug: 'primary-program',
      }),
    );
  });

  it('threads detached linked progress through exact-id persistence without rewards', async () => {
    vi.mocked(isXapiCompletionVerb).mockReturnValue(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organizationId: 'org-1',
      enrolledProgram: null,
      courseEnrollments: [],
    } as never);
    vi.mocked(upsertCourseProgressFromXapiStatement).mockResolvedValueOnce({
      programSlug: 'canonical-program',
      courseSlug: 'course-one',
      courseName: 'Course One',
      courseraCourseId: 'coursera-course-1',
      trainingStartedTransition: true,
    });
    vi.mocked(loadValidatedProgramCourses).mockResolvedValueOnce({
      courses: [
        {
          slug: 'course-one',
          name: 'Course One',
          estimatedHours: 10,
          courseraCourseId: 'coursera-course-1',
        },
      ],
      source: 'syllabus',
      unmappedSlugs: [],
      staleCourseraIds: [],
    } as never);
    vi.mocked(detectTrainingMilestone).mockResolvedValueOnce({
      ok: true,
      created: true,
      cascadeId: 'cascade-1',
    });

    await handleInboundParsedStatement(
      {
        email: 'member@example.com',
        courseName: 'Course One',
        courseraCourseId: 'coursera-course-1',
        activityType: 'course',
        statementId: 'statement-progress-1',
        verbId: 'http://adlnet.gov/expapi/verbs/progressed',
        rawStatement: {},
      },
      { organizationId: 'org-1', statementHash: 'hash-progress-1' },
    );

    expect(upsertCourseProgressFromXapiStatement).toHaveBeenCalledWith({
      userId: 'member-1',
      enrolledProgramSlug: null,
      parsed: expect.objectContaining({ courseraCourseId: 'coursera-course-1' }),
    });
    expect(completeMemberCourse).not.toHaveBeenCalled();
    expect(awardPoints).not.toHaveBeenCalled();
    expect(recordXapiEvent).toHaveBeenCalledWith(
      expect.objectContaining({ completionStatus: 'ignored', matchedUserId: 'member-1' }),
    );
    expect(detectTrainingMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        milestoneType: 'training_started',
        milestoneRef: 'canonical-program',
        source: 'coursera-webhook',
      }),
    );
  });
});
