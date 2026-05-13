import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Set env before route module loads ───
process.env.NEXT_PUBLIC_SITE_URL = 'https://test.workforceap.org';

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

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    atRiskAlert: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/member/atRiskScoring', () => ({
  calculateAllAtRiskScores: vi.fn(),
  persistAtRiskAlert: vi.fn(),
  getRiskLevel: vi.fn((score: number) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    return 'medium';
  }),
  THRESHOLDS: { CRITICAL: 80, HIGH: 60, MEDIUM: 40 },
}));

vi.mock('@/lib/email', () => ({
  sendAtRiskAlertDigestEmail: vi.fn(),
  getAtRiskDigestRecipients: vi.fn(),
}));

vi.mock('@/lib/admin/logCronRun', () => ({
  logCronRun: vi.fn(),
}));

vi.mock('@/lib/cron/withCronLogging', () => ({
  withCronLogging: vi.fn((_key, handler) => handler),
}));

vi.mock('@/lib/cron/cronExecution', () => ({
  setCronRecordsProcessed: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as atRiskGET } from '@/app/api/cron/at-risk-check/route';
import { prisma } from '@/lib/db/prisma';
import { calculateAllAtRiskScores, persistAtRiskAlert, getRiskLevel } from '@/lib/member/atRiskScoring';
import { sendAtRiskAlertDigestEmail, getAtRiskDigestRecipients } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

describe('GET /api/cron/at-risk-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scores members and persists alerts for medium+ risk', async () => {
    const scores = [
      { userId: 'user-1', score: 85, factors: [{ description: 'No login 30d' }], recommendedAction: 'Reach out' },
      { userId: 'user-2', score: 50, factors: [{ description: 'Late submission' }], recommendedAction: 'Check in' },
      { userId: 'user-3', score: 20, factors: [], recommendedAction: '' },
    ];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue(['admin@example.com']);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', fullName: 'Alice' },
    ] as any);
    vi.mocked(sendAtRiskAlertDigestEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scored).toBe(3);
    expect(json.critical).toBe(1);
    expect(json.high).toBe(0);
    expect(json.medium).toBe(1);
    expect(json.alertsCreated).toBe(2);
    expect(persistAtRiskAlert).toHaveBeenCalledTimes(2);
  });

  it('resolves stale alerts for members no longer at risk', async () => {
    const scores = [{ userId: 'user-1', score: 20, factors: [], recommendedAction: '' }];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue(['admin@example.com']);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([
      { id: 'alert-1' },
      { id: 'alert-2' },
    ] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    vi.mocked(sendAtRiskAlertDigestEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alertsResolved).toBe(2);
    expect(prisma.atRiskAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'resolved' }),
      })
    );
  });

  it('sends digest email to recipients', async () => {
    const scores = [
      { userId: 'user-1', score: 85, factors: [{ description: 'No login' }], recommendedAction: 'Call' },
    ];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue(['admin@example.com', 'counselor@example.com']);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', fullName: 'Alice' },
    ] as any);
    vi.mocked(sendAtRiskAlertDigestEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.digestEmailSent).toBe(true);
    expect(sendAtRiskAlertDigestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['admin@example.com', 'counselor@example.com'],
        criticalCount: 1,
        highCount: 0,
        mediumCount: 0,
      })
    );
  });

  it('handles missing digest recipients gracefully', async () => {
    const scores = [{ userId: 'user-1', score: 20, factors: [], recommendedAction: '' }];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue([]);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);

    const res = await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.digestEmailSent).toBe(false);
    expect(json.digestEmailError).toBe('No recipients');
  });

  it('logs error when digest email fails', async () => {
    const scores = [
      { userId: 'user-1', score: 85, factors: [{ description: 'No login' }], recommendedAction: 'Call' },
    ];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue(['admin@example.com']);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', fullName: 'Alice' },
    ] as any);
    vi.mocked(sendAtRiskAlertDigestEmail).mockResolvedValue({ ok: false, error: 'SMTP down' });

    await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_at_risk_check',
      expect.any(Object),
      'error'
    );
  });

  it('includes member admin URLs in digest', async () => {
    const scores = [
      { userId: 'user-1', score: 85, factors: [{ description: 'No login' }], recommendedAction: 'Call' },
    ];
    vi.mocked(calculateAllAtRiskScores).mockResolvedValue(scores as any);
    vi.mocked(getAtRiskDigestRecipients).mockReturnValue(['admin@example.com']);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'user-1', email: 'a@example.com', fullName: 'Alice' },
    ] as any);
    vi.mocked(sendAtRiskAlertDigestEmail).mockResolvedValue({ ok: true, error: undefined });

    await atRiskGET(new Request('http://localhost:3000/api/cron/at-risk-check'));
    expect(sendAtRiskAlertDigestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        members: expect.arrayContaining([
          expect.objectContaining({
            adminUrl: expect.stringContaining('/admin/members/user-1'),
          }),
        ]),
      })
    );
  });
});
