import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    memberEvent: { create: vi.fn().mockResolvedValue({}) },
    user: { findMany: vi.fn() },
    // Shared 7-day nudge cooldown (lib/cron/nudgeThrottle.ts): empty log ⇒
    // every candidate stays eligible, matching these tests' expectations.
    memberNudgeLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendInactiveNudgeEmail: vi.fn(),
}));

// Nudges now also fan out in-app/push alongside email — keep it inert here.
vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
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

import { GET } from '@/app/api/cron/inactive-nudge/route';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { CRON_NUDGE_CANDIDATE_CAP } from '@/lib/cron/cronCaps';

describe('GET /api/cron/inactive-nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends nudges to inactive eligible members and excludes recently active', async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'inactive-1', email: 'a@example.com', fullName: 'A' },
      { id: 'inactive-2', email: 'b@example.com', fullName: 'B' },
    ]);
    (sendInactiveNudgeEmail as any).mockResolvedValue({ ok: true });

    const res = await GET(new Request('http://localhost/api/cron/inactive-nudge'));
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.candidateCount).toBe(2);
    expect(json.eligibleCount).toBe(2);
    expect(json.inactiveEmailsSent).toBe(2);
    expect(sendInactiveNudgeEmail).toHaveBeenCalledTimes(2);

    const findManyArgs = (prisma.user.findMany as any).mock.calls[0][0];
    expect(findManyArgs.where.notificationsReminders).toBe(true);
    expect(findManyArgs.where.deletedAt).toBeNull();
    expect(findManyArgs.where.AND).toEqual([
      { memberEvents: { none: { createdAt: { gte: expect.any(Date) } } } },
      {
        memberEvents: {
          none: {
            eventName: 'inactive_nudge_sent',
            createdAt: { gte: expect.any(Date) },
          },
        },
      },
    ]);
    expect(findManyArgs.take).toBe(CRON_NUDGE_CANDIDATE_CAP);
    expect(prisma.memberEvent.create).toHaveBeenCalledTimes(2);
  });

  it('counts only successful sends', async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: '1', email: 'a@x.com', fullName: 'A' },
      { id: '2', email: 'b@x.com', fullName: 'B' },
      { id: '3', email: 'c@x.com', fullName: 'C' },
    ]);
    (sendInactiveNudgeEmail as any)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'bounce' })
      .mockResolvedValueOnce({ ok: true });

    const res = await GET(new Request('http://localhost/api/cron/inactive-nudge'));
    const json = await res.json();
    expect(json.inactiveEmailsSent).toBe(2);
    expect(setCronRecordsProcessed).toHaveBeenCalledWith(2);
  });

  it('continues when sendInactiveNudgeEmail throws', async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: '1', email: 'a@x.com', fullName: 'A' },
      { id: '2', email: 'b@x.com', fullName: 'B' },
    ]);
    (sendInactiveNudgeEmail as any)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ ok: true });

    const res = await GET(new Request('http://localhost/api/cron/inactive-nudge'));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inactiveEmailsSent).toBe(1);
  });

  it('logs run results', async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    await GET(new Request('http://localhost/api/cron/inactive-nudge'));
    expect(logCronRun).toHaveBeenCalledWith(
      'cron_inactive_nudge',
      expect.objectContaining({ ok: true, inactiveEmailsSent: 0 }),
    );
  });
});
