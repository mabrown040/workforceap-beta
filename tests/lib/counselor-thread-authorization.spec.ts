import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  thread: vi.fn(), member: vi.fn(), assignment: vi.fn(),
  admin: vi.fn(), adminInOrg: vi.fn(), superAdmin: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {
  messageThread: { findUnique: mocks.thread },
  user: { findFirst: mocks.member },
  counselorAssignment: { findFirst: mocks.assignment },
} }));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: mocks.admin, isAdminInOrg: mocks.adminInOrg, isSuperAdmin: mocks.superAdmin,
}));
import { assertStaffCanAccessThread, assertStaffCanPost } from '@/lib/messages/counselorThread';

const thread = { id: 'thread', kind: 'member', memberId: 'member', counselorUserId: 'old-counselor' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.thread.mockResolvedValue(thread);
  mocks.member.mockResolvedValue({ organizationId: 'org-a' });
  mocks.admin.mockResolvedValue(false);
  mocks.adminInOrg.mockResolvedValue(false);
  mocks.superAdmin.mockResolvedValue(false);
  mocks.assignment.mockResolvedValue(null);
});

describe('member conversation authority follows current assignments', () => {
  it.each(['reassigned', 'never assigned'])('denies a %s legacy owner for reads and posts', async () => {
    expect(await assertStaffCanAccessThread('old-counselor', 'thread')).toBeNull();
    expect(await assertStaffCanPost('old-counselor', 'thread')).toBeNull();
    expect(mocks.assignment).toHaveBeenCalled();
  });

  it('allows the current active counselor even when routing still names someone else', async () => {
    mocks.assignment.mockResolvedValue({ id: 'current-assignment' });
    expect(await assertStaffCanAccessThread('new-counselor', 'thread')).toEqual(thread);
    expect(mocks.assignment).toHaveBeenCalledWith({
      where: {
        memberId: 'member', active: true,
        counselor: { userId: 'new-counselor', active: true, user: { organizationId: 'org-a', deletedAt: null } },
      },
      select: { id: true },
    });
  });

  it.each([
    { label: 'inactive assignment', assignmentActive: false, counselorActive: true, counselorOrg: 'org-a', deletedAt: null },
    { label: 'inactive counselor', assignmentActive: true, counselorActive: false, counselorOrg: 'org-a', deletedAt: null },
    { label: 'foreign counselor', assignmentActive: true, counselorActive: true, counselorOrg: 'org-b', deletedAt: null },
    { label: 'deleted counselor', assignmentActive: true, counselorActive: true, counselorOrg: 'org-a', deletedAt: new Date() },
  ])('does not authorize an $label through the routing pointer', async (row) => {
    mocks.assignment.mockImplementation(async ({ where }) => {
      const c = where.counselor;
      return row.assignmentActive === where.active && row.counselorActive === c.active
        && row.counselorOrg === c.user.organizationId && row.deletedAt === c.user.deletedAt
        ? { id: 'assignment' } : null;
    });
    expect(await assertStaffCanPost('old-counselor', 'thread')).toBeNull();
  });

  it('preserves same-org admin and super-admin access without an assignment', async () => {
    mocks.adminInOrg.mockImplementation(async (id, org) => id === 'org-admin' && org === 'org-a');
    expect(await assertStaffCanPost('org-admin', 'thread')).toEqual(thread);
    mocks.superAdmin.mockResolvedValue(true);
    expect(await assertStaffCanAccessThread('super-admin', 'thread')).toEqual(thread);
    expect(mocks.assignment).not.toHaveBeenCalled();
  });

  it('rejects an outside-org admin who is only a historical routing owner', async () => {
    mocks.admin.mockResolvedValue(true);
    expect(await assertStaffCanAccessThread('old-counselor', 'thread')).toBeNull();
    expect(mocks.adminInOrg).toHaveBeenCalledWith('old-counselor', 'org-a');
  });

  it('rejects missing or deleted member records even for a matching owner', async () => {
    mocks.member.mockResolvedValue(null);
    expect(await assertStaffCanAccessThread('old-counselor', 'thread')).toBeNull();
    expect(mocks.member).toHaveBeenCalledWith({ where: { id: 'member', deletedAt: null }, select: { organizationId: true } });
    expect(mocks.assignment).not.toHaveBeenCalled();
  });
});
