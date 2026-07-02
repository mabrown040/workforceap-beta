import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isSuperAdmin: vi.fn(() => Promise.resolve(false)), isAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: vi.fn((handler: () => Promise<Response>) => handler),
}));
vi.mock('@/lib/admin/funderProgramMetrics', () => ({
  getFunderProgramSummaryRows: vi.fn(),
}));

import { GET } from '@/app/api/admin/funder-program-summary/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { getFunderProgramSummaryRows } from '@/lib/admin/funderProgramMetrics';
import { FUNDER_PROGRAM_SUMMARY_CSV_HEADERS } from '@/lib/admin/funderProgramSummaryCsv';

describe('GET /api/admin/funder-program-summary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'user@example.com' } as never);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns funder-ready CSV with expected headers for admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as never);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(getFunderProgramSummaryRows).mockResolvedValue({
      rows: [
        {
          programSlug: 'health-admin',
          programTitle: 'Healthcare Admin',
          totalEnrolled: 10,
          activeLast30d: 5,
          completed: 2,
          placed: 1,
          atRisk: 3,
          completionPct: 20,
          placementPct: 10,
        },
      ],
      truncated: false,
    });

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/funder-program-summary-\d{4}-\d{2}-\d{2}\.csv/);

    const csv = await res.text();
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(FUNDER_PROGRAM_SUMMARY_CSV_HEADERS.join(','));
    expect(lines[1]).toContain('Healthcare Admin');
    expect(lines[1]).toContain('10,5,2,1,3,20%,10%');
  });

  it('sets truncation headers when export limit is hit', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as never);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    vi.mocked(getFunderProgramSummaryRows).mockResolvedValue({ rows: [], truncated: true });

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Export-Truncated')).toBe('true');
    expect(res.headers.get('X-Export-Limit')).toBe('10000');
  });
});
