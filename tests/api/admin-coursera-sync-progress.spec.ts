import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  getOrg: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
  promote: vi.fn(),
  refresh: vi.fn(),
  replay: vi.fn(),
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
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: mocks.isAdmin }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: mocks.getOrg }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock('@/lib/coursera/csvImport.server', () => ({
  promoteCsvProgressToCanonical: mocks.promote,
}));
vi.mock('@/lib/member/courseProgress', () => ({
  refreshMemberProgramProgressRollup: mocks.refresh,
}));
vi.mock('@/lib/coursera/replayPendingXapi', () => ({
  replayPendingXapiStatements: mocks.replay,
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }));

import { POST } from '@/app/api/admin/coursera/sync-progress/route';

describe('POST /api/admin/coursera/sync-progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'admin-1' });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getOrg.mockResolvedValue('org-1');
    mocks.findMany.mockResolvedValue([
      { userId: 'user-1', programSlug: 'program-one' },
    ]);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ courseProgress: { findMany: mocks.findMany } }),
    );
    mocks.promote.mockResolvedValue({ upserted: 1, errors: 0 });
    mocks.refresh.mockResolvedValue(undefined);
  });

  it('promotes and refreshes only the actor organization without global xAPI replay', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/coursera/sync-progress', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.replay).not.toHaveBeenCalled();
    expect(mocks.promote).toHaveBeenCalledWith({ organizationId: 'org-1' });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { organizationId: 'org-1' } },
      }),
    );
    expect(mocks.refresh).toHaveBeenCalledWith('user-1', 'program-one');
    expect(await response.json()).toMatchObject({
      xapi: { replayed: 0, deferredToSystemCron: true },
      rollups: { run: 1, errors: 0, total: 1 },
    });
  });
});
