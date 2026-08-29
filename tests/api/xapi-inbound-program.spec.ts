import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn() }));
vi.mock('@/lib/member/courseCompletion', () => ({ completeMemberCourse: vi.fn() }));
vi.mock('@/lib/member/courseProgress', () => ({ upsertCourseProgressFromXapiStatement: vi.fn() }));
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
import { upsertCourseProgressFromXapiStatement } from '@/lib/member/courseProgress';
import { awardPoints } from '@/lib/member/points';
import { handleInboundParsedStatement } from '@/lib/xapi/inboundStatementPipeline';
import { recordXapiEvent, resolveXapiUser } from '@/lib/xapi/mappings';
import { isXapiCompletionVerb } from '@/lib/xapi/statements';
import { markXapiStatementProcessed } from '@/lib/xapi/storage';

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
    vi.mocked(recordXapiEvent).mockResolvedValue(undefined);
    vi.mocked(markXapiStatementProcessed).mockResolvedValue(undefined);
  });

  it('records No program enrolled instead of crediting a cleared historical program', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      enrolledProgram: null,
      courseEnrollments: [
        { programSlug: 'historical-program', isPrimary: false },
      ],
    } as never);

    const result = await handleInboundParsedStatement(
      {
        email: 'member@example.com',
        courseSlug: 'course-one',
        courseName: 'Course One',
        statementId: 'statement-1',
        verbId: 'http://adlnet.gov/expapi/verbs/completed',
        rawStatement: {},
      },
      { organizationId: 'org-1', statementHash: 'hash-1' },
    );

    expect(result.completions).toEqual([
      expect.objectContaining({ ok: false, error: 'No program enrolled' }),
    ]);
    expect(upsertCourseProgressFromXapiStatement).not.toHaveBeenCalled();
    expect(recordXapiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        matchedUserId: 'member-1',
        completionStatus: 'error',
        error: 'No program enrolled',
      }),
    );
    expect(markXapiStatementProcessed).toHaveBeenCalledWith('statement-1', 'hash-1');
  });
});
