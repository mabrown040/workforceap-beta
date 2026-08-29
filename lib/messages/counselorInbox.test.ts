import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  memberFindMany: vi.fn(),
  threadFindMany: vi.fn(),
  threadCreateMany: vi.fn(),
  assignmentFindMany: vi.fn(),
  queryRaw: vi.fn(),
  getOrCreate: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findMany: mocks.memberFindMany },
    messageThread: {
      findMany: mocks.threadFindMany,
      createMany: mocks.threadCreateMany,
    },
    counselorAssignment: { findMany: mocks.assignmentFindMany },
    $queryRaw: mocks.queryRaw,
  },
}));
vi.mock('@/lib/messages/counselorThread', () => ({
  getOrCreateMemberCounselorThread: mocks.getOrCreate,
}));

import { buildCounselorInboxRows } from './counselorInbox';

describe('buildCounselorInboxRows read-only audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberFindMany.mockResolvedValue([
      { id: 'member-1', fullName: 'Member One', enrolledProgram: null, programInterest: null },
    ]);
    mocks.threadFindMany.mockResolvedValue([]);
    mocks.queryRaw.mockResolvedValue([]);
  });

  it('does not create missing message threads', async () => {
    await expect(
      buildCounselorInboxRows(['member-1'], { readOnlyAudit: true }),
    ).resolves.toEqual([]);

    expect(mocks.assignmentFindMany).not.toHaveBeenCalled();
    expect(mocks.threadCreateMany).not.toHaveBeenCalled();
    expect(mocks.getOrCreate).not.toHaveBeenCalled();
  });
});
