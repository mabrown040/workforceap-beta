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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isSuperAdmin: vi.fn(() => Promise.resolve(false)), isAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));

vi.mock('@/lib/xapi/mappings', () => ({
  listCourseraIdentityMappings: vi.fn(),
  listRecentUnmatchedXapiEvents: vi.fn(),
  upsertCourseraIdentityMapping: vi.fn(),
}));

vi.mock('@/lib/xapi/reprocess', () => ({
  reprocessUnmatchedXapiEvents: vi.fn(),
}));

vi.mock('@/lib/coursera/replayPendingXapi', () => ({
  replayUnresolvedXapiStatementsForIdentity: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET, POST } from '@/app/api/admin/coursera/mappings/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import {
  listCourseraIdentityMappings,
  listRecentUnmatchedXapiEvents,
  upsertCourseraIdentityMapping,
} from '@/lib/xapi/mappings';
import { reprocessUnmatchedXapiEvents } from '@/lib/xapi/reprocess';
import { replayUnresolvedXapiStatementsForIdentity } from '@/lib/coursera/replayPendingXapi';

const postReq = (body: unknown) =>
  new Request('http://localhost:3000/api/admin/coursera/mappings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

function mockAdmin() {
  vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);
  vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
}

describe('GET /api/admin/coursera/mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost:3000/api/admin/coursera/mappings'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);

    const res = await GET(new Request('http://localhost:3000/api/admin/coursera/mappings'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns mappings and unmatched events for admin', async () => {
    mockAdmin();
    vi.mocked(listCourseraIdentityMappings).mockResolvedValue([
      { userId: 'u1', courseraEmail: 'c1@example.com' },
    ] as any);
    vi.mocked(listRecentUnmatchedXapiEvents).mockResolvedValue([
      { id: 'evt-1', actorEmail: 'unknown@example.com' },
    ] as any);

    const res = await GET(new Request('http://localhost:3000/api/admin/coursera/mappings'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mappings).toHaveLength(1);
    expect(body.unmatchedEvents).toHaveLength(1);
    expect(listCourseraIdentityMappings).toHaveBeenCalledWith({ organizationId: 'org-1' });
    expect(listRecentUnmatchedXapiEvents).toHaveBeenCalledWith(50, { organizationId: 'org-1' });
  });

  it('respects unmatchedLimit query param', async () => {
    mockAdmin();
    vi.mocked(listCourseraIdentityMappings).mockResolvedValue([] as any);
    vi.mocked(listRecentUnmatchedXapiEvents).mockResolvedValue([] as any);

    const res = await GET(
      new Request('http://localhost:3000/api/admin/coursera/mappings?unmatchedLimit=10')
    );
    expect(res.status).toBe(200);
    expect(listRecentUnmatchedXapiEvents).toHaveBeenCalledWith(10, { organizationId: 'org-1' });
  });

  it('clamps unmatchedLimit to 1-200 range', async () => {
    mockAdmin();
    vi.mocked(listCourseraIdentityMappings).mockResolvedValue([] as any);
    vi.mocked(listRecentUnmatchedXapiEvents).mockResolvedValue([] as any);

    await GET(
      new Request('http://localhost:3000/api/admin/coursera/mappings?unmatchedLimit=0')
    );
    expect(listRecentUnmatchedXapiEvents).toHaveBeenCalledWith(1, { organizationId: 'org-1' });

    await GET(
      new Request('http://localhost:3000/api/admin/coursera/mappings?unmatchedLimit=999')
    );
    expect(listRecentUnmatchedXapiEvents).toHaveBeenCalledWith(200, { organizationId: 'org-1' });
  });

  it('returns 500 when mapping service throws', async () => {
    mockAdmin();
    vi.mocked(listCourseraIdentityMappings).mockRejectedValue(new Error('DB error'));

    const res = await GET(new Request('http://localhost:3000/api/admin/coursera/mappings'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'DB error' });
  });

  it('returns 500 on unexpected outer error', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Auth failure'));

    const res = await GET(new Request('http://localhost:3000/api/admin/coursera/mappings'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/admin/coursera/mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await POST(postReq({ userId: 'u1', courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 for invalid JSON', async () => {
    mockAdmin();

    const res = await POST(postReq('not-json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON' });
  });

  it('returns 400 when userId is missing', async () => {
    mockAdmin();

    const res = await POST(postReq({ courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'userId is required' });
  });

  it('returns 400 when neither courseraEmail nor actorIdentifier provided', async () => {
    mockAdmin();

    const res = await POST(postReq({ userId: 'u1' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'courseraEmail or actorIdentifier is required',
    });
  });

  it('creates mapping with courseraEmail and reprocesses events', async () => {
    mockAdmin();
    vi.mocked(upsertCourseraIdentityMapping).mockResolvedValue({
      id: 'map-1',
      userId: 'u1',
      courseraEmail: 'c@example.com',
    } as any);
    vi.mocked(reprocessUnmatchedXapiEvents).mockResolvedValue({
      processed: 5,
      matched: 3,
      errors: 0,
      details: [],
    } as any);
    vi.mocked(replayUnresolvedXapiStatementsForIdentity).mockResolvedValue({
      replayed: 2,
      matched: 1,
    } as any);

    const res = await POST(postReq({ userId: 'u1', courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mapping).toMatchObject({ userId: 'u1', courseraEmail: 'c@example.com' });
    expect(body.reprocessed).toMatchObject({ processed: 5, matched: 3 });
    expect(body.xapiReplay).toMatchObject({ replayed: 2, matched: 1 });
    expect(upsertCourseraIdentityMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        courseraEmail: 'c@example.com',
        createdByUserId: 'admin-1',
        source: 'manual-admin-api',
        expectedOrganizationId: 'org-1',
      })
    );
  });

  it('creates mapping with actorIdentifier instead of courseraEmail', async () => {
    mockAdmin();
    vi.mocked(upsertCourseraIdentityMapping).mockResolvedValue({
      id: 'map-2',
      userId: 'u1',
      actorIdentifier: 'actor-123',
    } as any);
    vi.mocked(reprocessUnmatchedXapiEvents).mockResolvedValue({
      processed: 0,
      matched: 0,
      errors: 0,
      details: [],
    } as any);
    vi.mocked(replayUnresolvedXapiStatementsForIdentity).mockResolvedValue(null as any);

    const res = await POST(
      postReq({ userId: 'u1', actorIdentifier: 'actor-123', actorHomePage: 'https://coursera.org' })
    );
    expect(res.status).toBe(200);
    expect(upsertCourseraIdentityMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        actorIdentifier: 'actor-123',
        actorHomePage: 'https://coursera.org',
      })
    );
  });

  it('returns 400 when upsert throws', async () => {
    mockAdmin();
    vi.mocked(upsertCourseraIdentityMapping).mockRejectedValue(new Error('Duplicate mapping'));

    const res = await POST(postReq({ userId: 'u1', courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Duplicate mapping' });
  });

  it('survives reprocess failure and still returns success', async () => {
    mockAdmin();
    vi.mocked(upsertCourseraIdentityMapping).mockResolvedValue({ id: 'map-1' } as any);
    vi.mocked(reprocessUnmatchedXapiEvents).mockRejectedValue(new Error('Reprocess crash'));
    vi.mocked(replayUnresolvedXapiStatementsForIdentity).mockRejectedValue(new Error('Replay crash'));

    const res = await POST(postReq({ userId: 'u1', courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reprocessed).toMatchObject({ processed: 0, matched: 0, errors: 0, details: [] });
    expect(body.xapiReplay).toBeNull();
  });

  it('returns 500 on unexpected outer error', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Auth failure'));

    const res = await POST(postReq({ userId: 'u1', courseraEmail: 'c@example.com' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
