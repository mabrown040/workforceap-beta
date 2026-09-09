import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { milestoneCascade: { findMany: mocks.findMany, count: mocks.count } } }));
vi.mock('@/lib/auth/roles', () => ({ isSuperAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));

import { countAwaitingApprovalCascades, listAwaitingApprovalCascades } from '@/lib/milestoneCascade/queries';

describe('milestone delivery review queue', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('keeps incomplete approved deliveries visible after TTL, scoped to the staff organization', async () => {
    mocks.findMany.mockResolvedValue([{ id: 'legacy-approved', status: 'approved', userId: 'member', user: { fullName: 'Learner', email: 'learner@example.com' }, drafts: [], dispatchState: null, expiresAt: new Date(0), createdAt: new Date(0) }]);
    mocks.count.mockResolvedValue(1);
    const scope = { kind: 'org' as const, organizationId: 'org-1' };
    const rows = await listAwaitingApprovalCascades({ scope });
    await countAwaitingApprovalCascades({ scope });
    const expectedWhere = {
      OR: [{ status: 'awaiting_approval', expiresAt: { gt: expect.any(Date) } }, { status: 'approved' }],
      user: { organizationId: 'org-1' },
    };
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
    expect(mocks.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(rows[0]).toMatchObject({ status: 'approved', dispatch: { canRetry: false, blockedReason: expect.stringContaining('reconciliation') } });
  });

  it('does not query or expose another tenant when organization lookup fails', async () => {
    expect(await listAwaitingApprovalCascades({ scope: { kind: 'deny' } })).toEqual([]);
    expect(await countAwaitingApprovalCascades({ scope: { kind: 'deny' } })).toBe(0);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
