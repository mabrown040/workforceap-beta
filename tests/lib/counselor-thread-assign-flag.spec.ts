import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findUniqueThread,
  createThread,
  updateThread,
  findFirstUser,
  findFirstAssignment,
  ensureSelfServeCounselorAssigned,
} = vi.hoisted(() => ({
  findUniqueThread: vi.fn(),
  createThread: vi.fn(),
  updateThread: vi.fn(),
  findFirstUser: vi.fn(),
  findFirstAssignment: vi.fn(),
  ensureSelfServeCounselorAssigned: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    messageThread: {
      findUnique: findUniqueThread,
      create: createThread,
      update: updateThread,
    },
    user: { findFirst: findFirstUser },
    counselorAssignment: { findFirst: findFirstAssignment },
  },
}));

vi.mock('@/lib/counselor/autoAssign', () => ({
  ensureSelfServeCounselorAssigned,
}));

import { getOrCreateMemberCounselorThread } from '@/lib/messages/counselorThread';

describe('getOrCreateMemberCounselorThread assignIfUnassigned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueThread.mockResolvedValue(null);
    createThread.mockResolvedValue({ id: 'thread-1', memberId: 'member-1', counselorUserId: null });
    findFirstAssignment.mockResolvedValue(null);
    findFirstUser.mockResolvedValue({ organizationId: 'org-1' });
    ensureSelfServeCounselorAssigned.mockResolvedValue({
      assigned: false,
      counselorUserId: null,
      reason: 'no_counselors',
    });
  });

  it('does not assign when staff or shared callers omit the flag', async () => {
    await getOrCreateMemberCounselorThread('member-1');
    expect(ensureSelfServeCounselorAssigned).not.toHaveBeenCalled();
    expect(findFirstUser).not.toHaveBeenCalled();
    expect(createThread).toHaveBeenCalled();
  });

  it('assigns only when the member-initiated flag is set', async () => {
    await getOrCreateMemberCounselorThread('member-1', { assignIfUnassigned: true });
    expect(ensureSelfServeCounselorAssigned).toHaveBeenCalledWith({
      memberId: 'member-1',
      organizationId: 'org-1',
    });
  });

  it('first thread open by a self-serve member ends with the new counselor on the thread', async () => {
    // Existing thread with no owner; auto-assign succeeds; the assignment row
    // is now visible, so the thread's counselorUserId is filled in.
    findUniqueThread.mockResolvedValue({ id: 'thread-1', memberId: 'member-1', counselorUserId: null });
    ensureSelfServeCounselorAssigned.mockResolvedValue({
      assigned: true,
      counselorUserId: 'counselor-1',
      reason: 'assigned',
    });
    findFirstAssignment.mockResolvedValue({ counselor: { userId: 'counselor-1', active: true } });
    updateThread.mockResolvedValue({ id: 'thread-1', memberId: 'member-1', counselorUserId: 'counselor-1' });

    const thread = await getOrCreateMemberCounselorThread('member-1', { assignIfUnassigned: true });

    expect(ensureSelfServeCounselorAssigned).toHaveBeenCalledTimes(1);
    expect(updateThread).toHaveBeenCalledWith({
      where: { id: 'thread-1' },
      data: { counselorUserId: 'counselor-1' },
    });
    expect(thread.counselorUserId).toBe('counselor-1');
    expect(createThread).not.toHaveBeenCalled();
  });

  it('partner-referred member thread open stays unowned when auto-assign declines', async () => {
    findUniqueThread.mockResolvedValue({ id: 'thread-1', memberId: 'member-1', counselorUserId: null });
    ensureSelfServeCounselorAssigned.mockResolvedValue({
      assigned: false,
      counselorUserId: null,
      reason: 'partner_referred',
    });
    findFirstAssignment.mockResolvedValue(null);

    const thread = await getOrCreateMemberCounselorThread('member-1', { assignIfUnassigned: true });

    expect(updateThread).not.toHaveBeenCalled();
    expect(createThread).not.toHaveBeenCalled();
    expect(thread.counselorUserId).toBeNull();
  });
});
