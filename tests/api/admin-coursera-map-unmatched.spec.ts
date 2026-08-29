import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  getActorOrganizationId: vi.fn(),
  mapIdentity: vi.fn(),
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
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: mocks.isAdmin }));
vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: mocks.getActorOrganizationId,
}));
vi.mock('@/lib/coursera/mapIdentityAndProgress.server', () => ({
  mapCourseraIdentityAndProgress: mocks.mapIdentity,
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/admin/coursera/map-unmatched/route';

describe('POST /api/admin/coursera/map-unmatched', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getActorOrganizationId.mockResolvedValue('org-1');
    mocks.mapIdentity.mockResolvedValue({
      mapping: { id: 'mapping-1' },
      backfill: {
        courseRowsUpdated: 2,
        badgeRowsUpdated: 1,
        promotion: { upserted: 2, unmapped: 0, rollupsRefreshed: 1, errors: 0 },
      },
    });
  });

  it('binds and promotes raw rows without replaying xAPI side effects', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/coursera/map-unmatched', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          courseraEmail: 'Learner@Example.com',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.mapIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        courseraEmail: 'Learner@Example.com',
        organizationId: 'org-1',
      }),
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      backfill: {
        promotion: { upserted: 2, rollupsRefreshed: 1 },
      },
      xapiReplay: null,
      xapiReplayDeferred: true,
    });
  });
});
