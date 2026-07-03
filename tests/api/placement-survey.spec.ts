import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdminOrCounselor: vi.fn(),
  isAdmin: vi.fn(),
  isCounselor: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const placementSurvey = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
  };
  const placementRecord = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const user = {
    findMany: vi.fn(),
    count: vi.fn(),
  };
  const courseProgress = {
    groupBy: vi.fn(),
  };
  const courseEnrollment = {
    count: vi.fn(),
    groupBy: vi.fn(),
  };
  const atRiskAlert = {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  };
  const counselorNote = {
    create: vi.fn().mockResolvedValue({}),
  };
  return { prisma: { $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }), placementSurvey, placementRecord, user, courseProgress, courseEnrollment, atRiskAlert, counselorNote } };
});

vi.mock('@/lib/cron/withCronLogging', () => ({
  withCronLogging: vi.fn((_key: string, handler: any) => handler),
}));

vi.mock('@/lib/cron/placement-surveys', () => ({
  runDailyPlacementSurveyCron: vi.fn(),
}));

vi.mock('@/lib/admin/logCronRun', () => ({
  logCronRun: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendPlacementSurveyEmail: vi.fn(),
  sendPlacementSurveyEscalationEmail: vi.fn(),
}));

// ─── Imports after mocks ───
import {
  issuePlacementSurveyToken,
  verifyPlacementSurveyToken,
} from '@/lib/security/placementSurveyToken';
import { POST as submitSurvey, GET as checkSurvey } from '@/app/api/placement-survey/route';
import { GET as listSurveys } from '@/app/api/admin/placement-surveys/route';
import { POST as resendSurvey } from '@/app/api/admin/placement-surveys/resend/route';
import { POST as runCron } from '@/app/api/cron/placement-survey/route';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { requireAdminOrCounselor, isAdmin, isCounselor } from '@/lib/auth/roles';
import { runDailyPlacementSurveyCron } from '@/lib/cron/placement-surveys';
import { sendPlacementSurveyEmail, sendPlacementSurveyEscalationEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

describe('Placement Survey Token', () => {
  beforeEach(() => {
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  it('issues and verifies a valid token', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-1' });
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verify = await verifyPlacementSurveyToken(token);
    expect(verify.ok).toBe(true);
    if (verify.ok) {
      expect(verify.surveyId).toBe('survey-1');
    }
  });

  it('rejects an expired token', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-2', ttlSeconds: -1 });
    const verify = await verifyPlacementSurveyToken(token);
    expect(verify.ok).toBe(false);
    if (!verify.ok) {
      expect(verify.reason).toBe('expired');
    }
  });

  it('rejects a tampered token', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-3' });
    const tampered = token.slice(0, -5) + 'xxxxx';
    const verify = await verifyPlacementSurveyToken(tampered);
    expect(verify.ok).toBe(false);
    if (!verify.ok) {
      expect(verify.reason).toBe('bad_signature');
    }
  });

  it('rejects a malformed token', async () => {
    const verify = await verifyPlacementSurveyToken('not-a-valid-token');
    expect(verify.ok).toBe(false);
    if (!verify.ok) {
      expect(verify.reason).toBe('malformed');
    }
  });

  it('issues a token valid for 30 days', async () => {
    const token = await issuePlacementSurveyToken({
      surveyId: 'survey-30d',
      ttlSeconds: 30 * 24 * 60 * 60,
    });
    const nowMs = Date.now();

    // 29 days later — still valid
    vi.spyOn(Date, 'now').mockReturnValue(nowMs + 29 * 24 * 60 * 60 * 1000);
    const verify29 = await verifyPlacementSurveyToken(token);
    expect(verify29.ok).toBe(true);

    // 31 days later — expired
    vi.spyOn(Date, 'now').mockReturnValue(nowMs + 31 * 24 * 60 * 60 * 1000);
    const verify31 = await verifyPlacementSurveyToken(token);
    expect(verify31.ok).toBe(false);
    if (!verify31.ok) {
      expect(verify31.reason).toBe('expired');
    }

    vi.restoreAllMocks();
  });

  it('token resolves to survey linked to correct placement', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-link' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-link',
      placementId: 'pl-correct',
      completedAt: null,
    } as any);

    const res = await checkSurvey(
      new Request(`http://localhost:3000/api/placement-survey?token=${encodeURIComponent(token)}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exists).toBe(true);
    expect(body.completed).toBe(false);

    expect(prisma.placementSurvey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'survey-link' } })
    );
  });
});

describe('POST /api/placement-survey (form submission)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  const makeRequest = (body: Record<string, unknown>): any =>
    new Request('http://localhost:3000/api/placement-survey', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 400 when token is missing', async () => {
    const res = await submitSurvey(makeRequest({ jobSatisfaction: 4 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing token' });
  });

  it('returns 401 when token is invalid', async () => {
    const res = await submitSurvey(makeRequest({ token: 'bad-token', jobSatisfaction: 4 }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Invalid token');
  });

  it('returns 410 when token is expired', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-exp', ttlSeconds: -1 });
    const res = await submitSurvey(makeRequest({ token, jobSatisfaction: 4 }));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toContain('expired');
  });

  it('returns 404 when survey is not found', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'missing-survey' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue(null);

    const res = await submitSurvey(makeRequest({ token, jobSatisfaction: 4 }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Survey not found' });
  });

  it('submits survey successfully with valid token', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-ok' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-ok',
      userId: 'user-1',
      placementId: 'pl-1',
      completedAt: null,
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-ok',
      completedAt: new Date(),
    } as any);

    const res = await submitSurvey(
      makeRequest({
        token,
        jobSatisfaction: 4.7,
        trainingRelevance: 5,
        supportQuality: 3,
        whatHelpedMost: 'Mentorship',
        whatCouldImprove: 'More practice interviews',
        stillEmployed: true,
        currentSalary: 65000,
        allowTestimonial: true,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const updateCall = vi.mocked(prisma.placementSurvey.update).mock.calls[0][0];
    expect(updateCall.data).toMatchObject({
      jobSatisfaction: 5,
      trainingRelevance: 5,
      supportQuality: 3,
      whatHelpedMost: 'Mentorship',
      whatCouldImprove: 'More practice interviews',
      stillEmployed: true,
      currentSalary: 65000,
      allowTestimonial: true,
    });
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);
  });

  it('clamps ratings to 1-5 range', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-clamp' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-clamp',
      userId: 'user-1',
      placementId: 'pl-1',
      completedAt: null,
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-clamp' } as any);

    const res = await submitSurvey(
      makeRequest({
        token,
        jobSatisfaction: 0,
        trainingRelevance: 10,
        supportQuality: -3,
      })
    );
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.placementSurvey.update).mock.calls[0][0];
    expect(updateCall.data.jobSatisfaction).toBe(1);
    expect(updateCall.data.trainingRelevance).toBe(5);
    expect(updateCall.data.supportQuality).toBe(1);
  });

  it('updates the survey linked to the correct placement', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-placement' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-placement',
      userId: 'user-1',
      placementId: 'pl-123',
      completedAt: null,
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-placement' } as any);

    const res = await submitSurvey(makeRequest({ token, jobSatisfaction: 4 }));
    expect(res.status).toBe(200);

    expect(prisma.placementSurvey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'survey-placement' } })
    );
    expect(prisma.placementSurvey.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'survey-placement' } })
    );
  });

  it('stores all response fields correctly', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-full' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-full',
      userId: 'user-1',
      placementId: 'pl-1',
      completedAt: null,
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-full' } as any);

    const res = await submitSurvey(
      makeRequest({
        token,
        jobSatisfaction: 4.2,
        trainingRelevance: 3,
        supportQuality: 5,
        whatHelpedMost: 'Mentorship program',
        whatCouldImprove: 'More hands-on labs',
        stillEmployed: true,
        currentSalary: 62000,
        allowTestimonial: true,
      })
    );
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(prisma.placementSurvey.update).mock.calls[0][0];
    expect(updateCall.data).toMatchObject({
      jobSatisfaction: 4,
      trainingRelevance: 3,
      supportQuality: 5,
      whatHelpedMost: 'Mentorship program',
      whatCouldImprove: 'More hands-on labs',
      stillEmployed: true,
      currentSalary: 62000,
      allowTestimonial: true,
    });
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);
  });
});

describe('POST /api/placement-survey (PlacementRecord retention sync)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
    vi.mocked(prisma.placementRecord.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.atRiskAlert.findFirst).mockResolvedValue(null as any);
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  const makeRequest = (body: Record<string, unknown>): any =>
    new Request('http://localhost:3000/api/placement-survey', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('marks the PlacementRecord separated and escalates to the counselor when stillEmployed is false', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-lost-job' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-lost-job',
      userId: 'user-1',
      placementId: 'pl-1',
      completedAt: null,
      wave: 'sixty_day',
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-lost-job',
      userId: 'user-1',
      placementId: 'pl-1',
      wave: 'sixty_day',
      allowTestimonial: false,
    } as any);

    const res = await submitSurvey(makeRequest({ token, stillEmployed: false }));
    expect(res.status).toBe(200);

    expect(prisma.placementRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pl-1' }),
        data: { retentionStatus: 'separated' },
      })
    );
    expect(prisma.atRiskAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', status: 'open' }),
      })
    );
    expect(prisma.counselorNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ memberId: 'user-1' }),
      })
    );
  });

  it('does not overwrite an already-decided retentionStatus on job loss', async () => {
    // Simulate: updateMany's WHERE excludes decided statuses, so a
    // counselor-set row simply matches 0 rows (count: 0) rather than being
    // clobbered — the route doesn't need to know which; it trusts the filter.
    vi.mocked(prisma.placementRecord.updateMany).mockResolvedValue({ count: 0 } as any);
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-decided' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-decided',
      userId: 'user-2',
      placementId: 'pl-2',
      completedAt: null,
      wave: 'ninety_day',
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-decided',
      userId: 'user-2',
      placementId: 'pl-2',
      wave: 'ninety_day',
      allowTestimonial: false,
    } as any);

    const res = await submitSurvey(makeRequest({ token, stillEmployed: false }));
    expect(res.status).toBe(200);

    const call = vi.mocked(prisma.placementRecord.updateMany).mock.calls[0][0];
    expect(call.where).toMatchObject({
      id: 'pl-2',
      OR: [{ retentionStatus: null }, { retentionStatus: { in: ['unknown', 'pending'] } }],
    });
  });

  it('backfills wageAtFollowUp and sets retained_90d for a still-employed ninety_day survey', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-retained-90' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-retained-90',
      userId: 'user-3',
      placementId: 'pl-3',
      completedAt: null,
      wave: 'ninety_day',
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-retained-90',
      userId: 'user-3',
      placementId: 'pl-3',
      wave: 'ninety_day',
      allowTestimonial: false,
    } as any);

    const res = await submitSurvey(makeRequest({ token, stillEmployed: true, currentSalary: 48000 }));
    expect(res.status).toBe(200);

    expect(prisma.placementRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pl-3', wageAtFollowUp: null },
        data: { wageAtFollowUp: 48000 },
      })
    );
    expect(prisma.placementRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pl-3', retentionStatus: null },
        data: { retentionStatus: 'retained_90d' },
      })
    );
    expect(prisma.atRiskAlert.create).not.toHaveBeenCalled();
  });

  it('sets retained_180d for a still-employed hundred_eighty_day survey', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-retained-180' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-retained-180',
      userId: 'user-4',
      placementId: 'pl-4',
      completedAt: null,
      wave: 'hundred_eighty_day',
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-retained-180',
      userId: 'user-4',
      placementId: 'pl-4',
      wave: 'hundred_eighty_day',
      allowTestimonial: false,
    } as any);

    const res = await submitSurvey(makeRequest({ token, stillEmployed: true, currentSalary: 55000 }));
    expect(res.status).toBe(200);

    expect(prisma.placementRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { retentionStatus: 'retained_180d' },
      })
    );
  });

  it('does not touch PlacementRecord for a thirty_day still-employed response (window not reached)', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-thirty' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-thirty',
      userId: 'user-5',
      placementId: 'pl-5',
      completedAt: null,
      wave: 'thirty_day',
    } as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({
      id: 'survey-thirty',
      userId: 'user-5',
      placementId: 'pl-5',
      wave: 'thirty_day',
      allowTestimonial: false,
    } as any);

    const res = await submitSurvey(makeRequest({ token, stillEmployed: true, currentSalary: 40000 }));
    expect(res.status).toBe(200);
    expect(prisma.placementRecord.updateMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/placement-survey (token check)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  it('returns exists=true and completed=false for pending survey', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-pending' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-pending',
      completedAt: null,
    } as any);

    const res = await checkSurvey(
      new Request(`http://localhost:3000/api/placement-survey?token=${encodeURIComponent(token)}`)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true, completed: false });
  });

  it('returns exists=true and completed=true for completed survey', async () => {
    const token = await issuePlacementSurveyToken({ surveyId: 'survey-done' });
    vi.mocked(prisma.placementSurvey.findUnique).mockResolvedValue({
      id: 'survey-done',
      completedAt: new Date(),
    } as any);

    const res = await checkSurvey(
      new Request(`http://localhost:3000/api/placement-survey?token=${encodeURIComponent(token)}`)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ exists: true, completed: true });
  });
});

describe('GET /api/admin/placement-surveys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when not admin or counselor', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({
      ok: false,
      error: 'Forbidden',
      status: 403,
    });

    const res = await listSurveys(new Request('http://localhost:3000/api/admin/placement-surveys'));
    expect(res.status).toBe(403);
  });

  it('returns surveys with global stats', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'admin-1' });
    vi.mocked(prisma.placementSurvey.findMany).mockResolvedValue([
      { id: 's1', user: { fullName: 'Alice', email: 'a@example.com', enrolledProgram: 'CNA' }, completedAt: new Date() },
      { id: 's2', user: { fullName: 'Bob', email: 'b@example.com', enrolledProgram: 'IT' }, completedAt: null },
    ] as any);
    vi.mocked(prisma.placementSurvey.count)
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(1) // globalCompleted
      .mockResolvedValueOnce(1) // globalPending
      .mockResolvedValueOnce(1); // globalTestimonialCount
    vi.mocked(prisma.placementSurvey.aggregate)
      .mockResolvedValueOnce({ _avg: { jobSatisfaction: 4.2 } } as any)
      .mockResolvedValueOnce({ _avg: { trainingRelevance: 3.8 } } as any)
      .mockResolvedValueOnce({ _avg: { supportQuality: 4.5 } } as any);

    const res = await listSurveys(new Request('http://localhost:3000/api/admin/placement-surveys'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.surveys).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.stats).toMatchObject({
      completed: 1,
      pending: 1,
      avgJobSatisfaction: 4.2,
      avgTrainingRelevance: 3.8,
      avgSupportQuality: 4.5,
      testimonialCount: 1,
    });
  });

  it('filters by status=completed', async () => {
    vi.mocked(requireAdminOrCounselor).mockResolvedValue({ ok: true, userId: 'admin-1' });
    vi.mocked(prisma.placementSurvey.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.placementSurvey.count).mockResolvedValue(0);
    vi.mocked(prisma.placementSurvey.aggregate).mockResolvedValue({ _avg: {} } as any);

    const res = await listSurveys(
      new Request('http://localhost:3000/api/admin/placement-surveys?status=completed')
    );
    expect(res.status).toBe(200);
    expect(prisma.placementSurvey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { completedAt: { not: null } },
      })
    );
  });
});

describe('POST /api/admin/placement-surveys/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new Request('http://localhost:3000/api/admin/placement-surveys/resend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 403 when not admin or counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await resendSurvey(makeRequest({ placementId: 'pl1' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when placementId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);

    const res = await resendSurvey(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Missing placementId' });
  });

  it('reuses pending survey and sends fresh token', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.placementRecord.findFirst).mockResolvedValue({
      id: 'pl1',
      userId: 'user-1',
      user: { id: 'user-1', email: 'alice@example.com', fullName: 'Alice', enrolledProgram: 'CNA' },
      placementSurveys: [{ id: 'survey-pending', wave: 'thirty_day', completedAt: null }],
    } as any);
    vi.mocked(sendPlacementSurveyEmail).mockResolvedValue({ ok: true });
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-pending' } as any);

    const res = await resendSurvey(makeRequest({ placementId: 'pl1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.surveyId).toBe('survey-pending');
    expect(body.wave).toBe('thirty_day');

    expect(prisma.placementSurvey.create).not.toHaveBeenCalled();
    expect(sendPlacementSurveyEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alice@example.com',
        fullName: 'Alice',
        programName: 'CNA',
        wave: 'thirty_day',
      })
    );
  });

  it('creates new survey when latest is completed', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.placementRecord.findFirst).mockResolvedValue({
      id: 'pl1',
      userId: 'user-1',
      user: { id: 'user-1', email: 'alice@example.com', fullName: 'Alice', enrolledProgram: 'CNA' },
      placementSurveys: [{ id: 'survey-done', wave: 'thirty_day', completedAt: new Date() }],
    } as any);
    vi.mocked(prisma.placementSurvey.create).mockResolvedValue({ id: 'survey-new' } as any);
    vi.mocked(sendPlacementSurveyEmail).mockResolvedValue({ ok: true });
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-new' } as any);

    const res = await resendSurvey(makeRequest({ placementId: 'pl1' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.surveyId).toBe('survey-new');
    expect(prisma.placementSurvey.create).toHaveBeenCalled();
  });
});

describe('POST /api/cron/placement-survey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns summary with total sent and escalations', async () => {
    vi.mocked(runDailyPlacementSurveyCron).mockResolvedValue({
      success: true,
      waves: [
        {
          wave: 'thirty_day',
          sent: [{ userId: 'u1', email: 'a@example.com', surveyId: 's1' }],
          skipped: [],
          emailFailures: [],
        },
        {
          wave: 'sixty_day',
          sent: [],
          skipped: [{ userId: 'u2', reason: 'No email' }],
          emailFailures: [],
        },
      ],
      escalations: {
        alerted: [{ userId: 'u1', counselorEmail: 'counselor@example.com' }],
        skipped: [],
        emailFailures: [],
      },
    });

    const res = await runCron(new Request('http://localhost:3000/api/cron/placement-survey'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toMatchObject({
      totalSent: 1,
      totalSkipped: 1,
      totalEmailFailures: 0,
      escalationsAlerted: 1,
      escalationsSkipped: 0,
      escalationsEmailFailures: 0,
    });
  });

  it('returns partial status when email failures occur', async () => {
    vi.mocked(runDailyPlacementSurveyCron).mockResolvedValue({
      success: true,
      waves: [
        {
          wave: 'thirty_day',
          sent: [],
          skipped: [],
          emailFailures: [{ userId: 'u1', error: 'Bounced' }],
        },
      ],
      escalations: {
        alerted: [],
        skipped: [],
        emailFailures: [],
      },
    });

    const res = await runCron(new Request('http://localhost:3000/api/cron/placement-survey'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalEmailFailures).toBe(1);
  });
});

describe('escalateStalePlacementSurveys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLACEMENT_SURVEY_TOKEN_SECRET = 'test-secret-32-bytes-long-1234567890';
  });

  afterEach(() => {
    delete process.env.PLACEMENT_SURVEY_TOKEN_SECRET;
  });

  it('triggers counselor alert after 7 days of no response', async () => {
    const { escalateStalePlacementSurveys } = (await vi.importActual(
      '@/lib/cron/placement-surveys'
    )) as typeof import('@/lib/cron/placement-surveys');

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 8);

    vi.mocked(prisma.placementSurvey.findMany).mockResolvedValue([
      {
        id: 'survey-stale',
        sentAt: staleDate,
        user: {
          id: 'user-1',
          fullName: 'Alice',
          email: 'alice@example.com',
          counselorAssignments: [
            {
              counselor: {
                user: { email: 'counselor@example.com', fullName: 'Counselor Bob' },
              },
            },
          ],
        },
        placement: { employerName: 'Acme', jobTitle: 'Dev', startDate: new Date('2025-01-01') },
      },
    ] as any);
    vi.mocked(prisma.placementSurvey.update).mockResolvedValue({ id: 'survey-stale' } as any);
    vi.mocked(prisma.placementSurvey.updateMany).mockResolvedValue({ count: 0 } as any);
    vi.mocked(sendPlacementSurveyEscalationEmail).mockResolvedValue({ ok: true });

    const result = await escalateStalePlacementSurveys();

    expect(result.alerted).toHaveLength(1);
    expect(result.alerted[0]).toMatchObject({
      userId: 'user-1',
      counselorEmail: 'counselor@example.com',
    });
    expect(sendPlacementSurveyEscalationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'counselor@example.com',
        counselorName: 'Counselor Bob',
        memberName: 'Alice',
        memberEmail: 'alice@example.com',
        employerName: 'Acme',
        jobTitle: 'Dev',
        surveyUrl: expect.stringContaining('/survey/placement/'),
      })
    );
    expect(prisma.placementSurvey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'survey-stale' },
        data: { escalatedAt: expect.any(Date) },
      })
    );
  });

  it('does not duplicate alerts (escalatedAt prevents re-processing)', async () => {
    const { escalateStalePlacementSurveys } = (await vi.importActual(
      '@/lib/cron/placement-surveys'
    )) as typeof import('@/lib/cron/placement-surveys');

    vi.mocked(prisma.placementSurvey.findMany).mockResolvedValue([] as any);

    await escalateStalePlacementSurveys();

    const findCall = vi.mocked(prisma.placementSurvey.findMany).mock.calls[0][0]!;
    expect(findCall.where).toMatchObject({
      wave: { in: ['thirty_day', 'sixty_day', 'ninety_day', 'hundred_eighty_day'] },
      completedAt: null,
      escalatedAt: null,
    });
    expect(sendPlacementSurveyEscalationEmail).not.toHaveBeenCalled();
  });

  it('skips escalation when counselor email is missing', async () => {
    const { escalateStalePlacementSurveys } = (await vi.importActual(
      '@/lib/cron/placement-surveys'
    )) as typeof import('@/lib/cron/placement-surveys');

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 8);

    vi.mocked(prisma.placementSurvey.findMany).mockResolvedValue([
      {
        id: 'survey-no-counselor',
        sentAt: staleDate,
        user: {
          id: 'user-2',
          fullName: 'Bob',
          email: 'bob@example.com',
          counselorAssignments: [],
        },
        placement: { employerName: 'Acme', jobTitle: 'Dev', startDate: new Date() },
      },
    ] as any);
    vi.mocked(prisma.placementSurvey.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await escalateStalePlacementSurveys();

    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({
      userId: 'user-2',
      reason: 'No active counselor email',
    });
    expect(sendPlacementSurveyEscalationEmail).not.toHaveBeenCalled();
    expect(prisma.placementSurvey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['survey-no-counselor'] } },
        data: { escalatedAt: expect.any(Date) },
      })
    );
  });
});
