import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findManyCounselors,
  groupByAssignments,
  updateManyUsers,
  findFirstAssignment,
  assignMemberCounselor,
  transaction,
} = vi.hoisted(() => ({
  findManyCounselors: vi.fn(),
  groupByAssignments: vi.fn(),
  updateManyUsers: vi.fn(),
  findFirstAssignment: vi.fn(),
  assignMemberCounselor: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/counselor/assignment', () => ({
  assignMemberCounselor,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: transaction,
  },
}));

import {
  ensureSelfServeCounselorAssigned,
  pickLeastLoadedWapCounselor,
} from '@/lib/counselor/autoAssign';

function fakeTx() {
  return {
    counselor: { findMany: findManyCounselors },
    counselorAssignment: { groupBy: groupByAssignments, findFirst: findFirstAssignment },
    user: { updateMany: updateManyUsers },
  };
}

describe('pickLeastLoadedWapCounselor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the org has no active WAP staff counselors', async () => {
    findManyCounselors.mockResolvedValue([]);
    await expect(pickLeastLoadedWapCounselor(fakeTx() as never, 'org-1')).resolves.toBeNull();
    expect(groupByAssignments).not.toHaveBeenCalled();
    expect(findManyCounselors).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          affiliation: 'wap_staff',
          user: { organizationId: 'org-1', deletedAt: null },
        }),
      }),
    );
  });

  it('picks the counselor with the fewest active assignments', async () => {
    findManyCounselors.mockResolvedValue([
      { id: 'cns-old', userId: 'user-old', createdAt: new Date('2025-01-01') },
      { id: 'cns-new', userId: 'user-new', createdAt: new Date('2026-01-01') },
    ]);
    groupByAssignments.mockResolvedValue([
      { counselorId: 'cns-old', _count: { _all: 4 } },
      { counselorId: 'cns-new', _count: { _all: 1 } },
    ]);

    await expect(pickLeastLoadedWapCounselor(fakeTx() as never, 'org-1')).resolves.toEqual({
      counselorId: 'cns-new',
      userId: 'user-new',
    });
  });

  it('breaks load ties with the older counselor row', async () => {
    findManyCounselors.mockResolvedValue([
      { id: 'cns-old', userId: 'user-old', createdAt: new Date('2025-01-01') },
      { id: 'cns-new', userId: 'user-new', createdAt: new Date('2026-01-01') },
    ]);
    groupByAssignments.mockResolvedValue([]);

    await expect(pickLeastLoadedWapCounselor(fakeTx() as never, 'org-1')).resolves.toEqual({
      counselorId: 'cns-old',
      userId: 'user-old',
    });
  });
});

describe('ensureSelfServeCounselorAssigned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx()));
  });

  it('returns already_assigned without picking when a counselor is active', async () => {
    updateManyUsers.mockResolvedValue({ count: 1 });
    findFirstAssignment.mockResolvedValue({
      counselor: { userId: 'counselor-1', active: true },
    });

    await expect(
      ensureSelfServeCounselorAssigned({ memberId: 'member-1', organizationId: 'org-1' }),
    ).resolves.toEqual({
      assigned: true,
      counselorUserId: 'counselor-1',
      reason: 'already_assigned',
    });
    expect(findManyCounselors).not.toHaveBeenCalled();
    expect(assignMemberCounselor).not.toHaveBeenCalled();
  });

  it('assigns the least-loaded WAP counselor', async () => {
    updateManyUsers.mockResolvedValue({ count: 1 });
    findFirstAssignment.mockResolvedValue(null);
    findManyCounselors.mockResolvedValue([
      { id: 'cns-1', userId: 'counselor-1', createdAt: new Date('2025-01-01') },
    ]);
    groupByAssignments.mockResolvedValue([]);
    assignMemberCounselor.mockResolvedValue({ counselor: { userId: 'counselor-1' }, thread: { id: 't1' } });

    await expect(
      ensureSelfServeCounselorAssigned({ memberId: 'member-1', organizationId: 'org-1' }),
    ).resolves.toEqual({
      assigned: true,
      counselorUserId: 'counselor-1',
      reason: 'assigned',
    });
    expect(assignMemberCounselor).toHaveBeenCalledWith(
      expect.anything(),
      {
        memberId: 'member-1',
        organizationId: 'org-1',
        counselorUserId: 'counselor-1',
      },
    );
  });

  it('returns no_counselors when the WAP staff pool is empty', async () => {
    updateManyUsers.mockResolvedValue({ count: 1 });
    findFirstAssignment.mockResolvedValue(null);
    findManyCounselors.mockResolvedValue([]);

    await expect(
      ensureSelfServeCounselorAssigned({ memberId: 'member-1', organizationId: 'org-1' }),
    ).resolves.toEqual({
      assigned: false,
      counselorUserId: null,
      reason: 'no_counselors',
    });
    expect(assignMemberCounselor).not.toHaveBeenCalled();
  });

  it('returns member_unavailable when the lock misses', async () => {
    updateManyUsers.mockResolvedValue({ count: 0 });

    await expect(
      ensureSelfServeCounselorAssigned({ memberId: 'member-1', organizationId: 'org-1' }),
    ).resolves.toEqual({
      assigned: false,
      counselorUserId: null,
      reason: 'member_unavailable',
    });
  });
});
