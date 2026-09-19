import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn(), isSuperAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));
vi.mock('@/lib/analytics/aiToolEfficacy', () => ({ analyzeAIEfficacy: vi.fn() }));

// ─── Imports after mocks ───
import { GET } from '@/app/api/admin/analytics/ai-efficacy/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { analyzeAIEfficacy } from '@/lib/analytics/aiToolEfficacy';

const REPORT = {
  dateRange: { start: '2026-06-21', end: '2026-09-19' },
  generatedAt: '2026-09-19T00:00:00.000Z',
  overall: {},
  byTool: [],
  topTools: [],
  summaryText: 'ok',
};
const URL_BASE = 'http://localhost/api/admin/analytics/ai-efficacy?startDate=2026-06-21&endDate=2026-09-19';

function request(extra = '') {
  return new Request(`${URL_BASE}${extra}`) as never;
}

describe('GET /api/admin/analytics/ai-efficacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'demo-admin@example.test' } as never);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(analyzeAIEfficacy).mockResolvedValue(REPORT as never);
  });

  it('super admin without ?orgId gets their own organization, not a 400', async () => {
    vi.mocked(isSuperAdmin).mockResolvedValue(true);

    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(REPORT);
    expect(analyzeAIEfficacy).toHaveBeenCalledTimes(1);
    expect(vi.mocked(analyzeAIEfficacy).mock.calls[0][0]).toBe('org-1');
  });

  it('super admin can choose an organization with ?orgId', async () => {
    vi.mocked(isSuperAdmin).mockResolvedValue(true);

    const res = await GET(request('&orgId=org-2'));
    expect(res.status).toBe(200);
    expect(vi.mocked(analyzeAIEfficacy).mock.calls[0][0]).toBe('org-2');
    expect(getActorOrganizationId).not.toHaveBeenCalled();
  });

  it('regular admin stays pinned to their own organization even with ?orgId', async () => {
    vi.mocked(isSuperAdmin).mockResolvedValue(false);

    const res = await GET(request('&orgId=org-2'));
    expect(res.status).toBe(200);
    expect(vi.mocked(analyzeAIEfficacy).mock.calls[0][0]).toBe('org-1');
  });

  it('still returns 400 when no organization can be resolved at all', async () => {
    vi.mocked(isSuperAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockRejectedValue(new Error('no user row'));

    const res = await GET(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Organization context required' });
    expect(analyzeAIEfficacy).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admins', async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);
    const res = await GET(request());
    expect(res.status).toBe(403);
  });
});
