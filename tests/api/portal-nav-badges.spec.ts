import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(body), {
          ...init,
          headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        }),
    },
  };
});

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: unknown) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/portal/navBadges', () => ({
  getNavBadgeCountsForUser: vi.fn(),
  isValidPortalBadgeRole: vi.fn((role: string) =>
    ['member', 'admin', 'employer', 'partner', 'counselor'].includes(role),
  ),
}));

import { GET } from '@/app/api/portal/nav-badges/route';
import { getUser } from '@/lib/auth/server';
import { getNavBadgeCountsForUser } from '@/lib/portal/navBadges';
import { NextRequest } from 'next/server';

describe('GET /api/portal/nav-badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'member-1' } as never);
  });

  it('returns the authenticated role counts with private caching', async () => {
    vi.mocked(getNavBadgeCountsForUser).mockResolvedValue({ counselor_messages_unread: 2 });

    const response = await GET(
      new NextRequest('http://localhost/api/portal/nav-badges?role=member') as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counselor_messages_unread: 2 });
    expect(response.headers.get('cache-control')).toContain('private');
  });

  it('returns 503 instead of a false-green empty 200 when badge loading fails', async () => {
    vi.mocked(getNavBadgeCountsForUser).mockRejectedValue(new Error('database unavailable'));

    const response = await GET(
      new NextRequest('http://localhost/api/portal/nav-badges?role=member') as never,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Navigation counts unavailable' });
  });
});
