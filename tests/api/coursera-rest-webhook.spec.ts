import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  readiness: vi.fn(),
  config: vi.fn(),
  verifyAuth: vi.fn(),
  resolveOrg: vi.fn(),
  resolveUser: vi.fn(),
  findUser: vi.fn(),
  claim: vi.fn(),
  markProcessed: vi.fn(),
  recordEvent: vi.fn(),
  completeCourse: vi.fn(),
  upsertProgress: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withSystemGuc: async (callback: () => Promise<unknown>) => callback(),
}));
vi.mock('@/lib/rate-limit', () => ({ checkWebhookRateLimit: mocks.rateLimit }));
vi.mock('@/lib/http/clientIp', () => ({ getClientIpFromRequest: () => '127.0.0.1' }));
vi.mock('@/lib/coursera/config', () => ({
  getCourseraReadiness: mocks.readiness,
  getCourseraConfig: mocks.config,
}));
vi.mock('@/lib/coursera/webhookAuth', () => ({
  verifyCourseraRestWebhookAuth: mocks.verifyAuth,
}));
vi.mock('@/lib/tenant/resolveOrgFromRequest', () => ({
  resolveOrgFromRequest: mocks.resolveOrg,
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findUnique: mocks.findUser } },
}));
vi.mock('@/lib/xapi/mappings', () => ({
  resolveXapiUser: mocks.resolveUser,
  recordXapiEvent: mocks.recordEvent,
}));
vi.mock('@/lib/xapi/storage', () => ({
  claimCourseraRestWebhookStatement: mocks.claim,
  markXapiStatementProcessed: mocks.markProcessed,
}));
vi.mock('@/lib/member/courseCompletion', () => ({
  completeMemberCourse: mocks.completeCourse,
}));
vi.mock('@/lib/member/courseProgress', () => ({
  upsertCourseProgressFromXapiStatement: mocks.upsertProgress,
}));

import { POST } from '@/app/api/webhooks/coursera/route';
import { buildCourseraRestSyntheticStatement } from '@/lib/coursera/restWebhookStatement';

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/webhooks/coursera', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Coursera REST webhook completion contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.readiness.mockReturnValue({ canReceiveWebhooks: true });
    mocks.config.mockReturnValue({ webhookSecret: 'configured-in-test' });
    mocks.verifyAuth.mockReturnValue({ ok: true, method: 'test' });
    mocks.resolveOrg.mockResolvedValue('org-1');
    mocks.resolveUser.mockResolvedValue({
      userId: 'member-1',
      email: 'member@example.com',
      fullName: 'Member One',
      mappingMethod: 'direct_email',
    });
    mocks.findUser.mockResolvedValue({
      organizationId: 'org-1',
      enrolledProgram: null,
      courseEnrollments: [],
    });
    mocks.claim.mockResolvedValue('claimed');
    mocks.markProcessed.mockResolvedValue(undefined);
    mocks.recordEvent.mockResolvedValue(undefined);
    mocks.completeCourse.mockResolvedValue({
      ok: true,
      alreadyCompleted: false,
      persistedWithoutProgram: true,
      programSlug: 'program-one',
      courseSlug: 'course-one',
      courseName: 'Course One',
      completedCount: 1,
    });
    mocks.upsertProgress.mockResolvedValue({
      programSlug: 'program-one',
      courseSlug: 'course-one',
      courseName: 'Course One',
      courseraCourseId: 'coursera-course-1',
    });
  });

  it('keeps 100 percent in progress without an explicit completion flag', () => {
    const parsed = buildCourseraRestSyntheticStatement(
      {
        email: 'member@example.com',
        courseName: 'Course One',
        progressPercent: 100,
      },
      'member@example.com',
      {},
    );

    expect(parsed.verbId).toBe('http://adlnet.gov/expapi/verbs/progressed');
    expect(parsed.resultCompletion).toBeNull();
  });

  it('persists an exact-id-only completion for a linked learner with no program', async () => {
    const response = await POST(request({
      email: 'member@example.com',
      contentId: 'coursera-course-1',
      completed: true,
      eventId: 'event-1',
    }));

    expect(response.status).toBe(200);
    expect(mocks.completeCourse).toHaveBeenCalledWith({
      userId: 'member-1',
      resolvedProgramSlug: null,
      courseSlug: undefined,
      courseName: undefined,
      courseraCourseId: 'coursera-course-1',
      source: 'coursera-webhook',
      notify: false,
    });
    expect(mocks.completeCourse.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.upsertProgress.mock.invocationCallOrder[0],
    );
    expect(await response.json()).toEqual(expect.objectContaining({
      matched: true,
      completed: true,
      persistedWithoutProgram: true,
    }));
  });

  it('does not turn a 100 percent progress delivery into completion', async () => {
    const response = await POST(request({
      email: 'member@example.com',
      courseraCourseId: 'coursera-course-1',
      courseSlug: 'course-one',
      courseName: 'Course One',
      progressPercent: 100,
      eventId: 'event-2',
    }));

    expect(response.status).toBe(200);
    expect(mocks.completeCourse).not.toHaveBeenCalled();
    expect(mocks.upsertProgress).toHaveBeenCalled();
    expect(await response.json()).toEqual(expect.objectContaining({
      progressRecorded: true,
      completed: false,
    }));
  });

  it('uses the primary enrollment instead of a stale legacy program', async () => {
    mocks.findUser.mockResolvedValueOnce({
      organizationId: 'org-1',
      enrolledProgram: 'legacy-program',
      courseEnrollments: [
        { programSlug: 'secondary-program', isPrimary: false },
        { programSlug: 'primary-program', isPrimary: true },
      ],
    });

    const response = await POST(request({
      email: 'member@example.com',
      contentId: 'coursera-course-1',
      completed: true,
      eventId: 'event-primary-program',
    }));

    expect(response.status).toBe(200);
    expect(mocks.completeCourse).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'member-1',
      resolvedProgramSlug: 'primary-program',
    }));
    expect(mocks.upsertProgress).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'member-1',
      enrolledProgramSlug: 'primary-program',
    }));
  });
});
