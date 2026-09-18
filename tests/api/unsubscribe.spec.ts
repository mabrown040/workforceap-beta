// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withSystemGuc: (fn: () => Promise<unknown>) => fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
  },
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from '@/app/api/unsubscribe/route';
import { buildUnsubscribeToken } from '@/lib/email/unsubscribeToken';

function request(token: string, method: 'GET' | 'POST' = 'POST') {
  return new NextRequest(`http://localhost:3000/api/unsubscribe?token=${encodeURIComponent(token)}`, {
    method,
  });
}

describe('GET/POST /api/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('UNSUBSCRIBE_TOKEN_SECRET', 'unsubscribe-test-secret');
    mocks.update.mockResolvedValue({ id: 'user-1' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mutes only the exact token address when ILIKE also matches a same-shaped neighbor', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'neighbor', email: 'real.person@example.com' },
      { id: 'owner', email: 'real_person@example.com' },
    ]);

    const res = await POST(request(buildUnsubscribeToken('real_person@example.com')));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { email: { equals: 'real_person@example.com', mode: 'insensitive' } },
      select: { id: true, email: true },
      take: 25,
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { notificationsUpdates: false, notificationsReminders: false },
    });
  });

  it('does not mute a neighbor when the token address itself is absent', async () => {
    mocks.findMany.mockResolvedValue([{ id: 'neighbor', email: 'real.person@example.com' }]);

    const res = await POST(request(buildUnsubscribeToken('real_person@example.com')));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('still mutes a legitimate underscore address when that exact row is the only hit', async () => {
    mocks.findMany.mockResolvedValue([{ id: 'owner', email: 'real_person@example.com' }]);

    const res = await GET(request(buildUnsubscribeToken('Real_Person@Example.com'), 'GET'));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("You're unsubscribed");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'owner' },
      data: { notificationsUpdates: false, notificationsReminders: false },
    });
  });

  it('rejects a forged token without touching the database', async () => {
    const res = await POST(request('not-a-real-token'));

    expect(res.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
