import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression for the Inbox Zero queue failing to load with Postgres 42883
 * ("operator does not exist: text = uuid"): `message_threads.member_id` is
 * `text`, so the staff-last-message query must bind the id array as
 * `text[]`, like the sibling queries in triageFlags/commandCenter do.
 */
const mocks = vi.hoisted(() => ({
  counselorFindFirst: vi.fn(),
  assignmentFindMany: vi.fn(),
  auditLogFindMany: vi.fn(),
  userFindMany: vi.fn(),
  applicationFindMany: vi.fn(),
  atRiskAlertFindMany: vi.fn(),
  queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselor: { findFirst: mocks.counselorFindFirst },
    counselorAssignment: { findMany: mocks.assignmentFindMany },
    auditLog: { findMany: mocks.auditLogFindMany },
    user: { findMany: mocks.userFindMany },
    application: { findMany: mocks.applicationFindMany },
    atRiskAlert: { findMany: mocks.atRiskAlertFindMany },
    $queryRawUnsafe: mocks.queryRawUnsafe,
  },
}));
vi.mock('@/lib/counselor/adminMemberScope', () => ({
  resolveAdminEnrolledMemberIds: vi.fn(async () => []),
}));

import { getInboxZeroQueue } from './inboxZero';

const MEMBER_IDS = [
  '7950abbf-ac8c-4805-8db7-8e1284a0ed21',
  'f5636f0b-da40-43fe-9ed9-21db789ca076',
  'a2fde6d6-3cea-4fdc-a439-588a93d58bd3',
];

describe('getInboxZeroQueue staff-last-message query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const assignedAt = new Date('2026-09-18T23:27:25Z');
    mocks.counselorFindFirst.mockResolvedValue({ id: 'counselor-1' });
    mocks.assignmentFindMany.mockResolvedValue(MEMBER_IDS.map((memberId) => ({ memberId, assignedAt })));
    mocks.auditLogFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue(
      MEMBER_IDS.map((id, i) => ({
        id,
        fullName: `Member ${i + 1}`,
        email: `member${i + 1}@example.test`,
        enrolledProgram: 'cybersecurity-google',
        createdAt: assignedAt,
        profile: null,
      })),
    );
    mocks.applicationFindMany.mockResolvedValue([]);
    mocks.atRiskAlertFindMany.mockResolvedValue([]);
    mocks.queryRawUnsafe.mockImplementation(async (sql: string) => {
      // Mirror Postgres: message_threads.member_id is text, so a uuid[] bind
      // cannot be compared to it.
      if (/ANY\(\$1::uuid\[\]\)/.test(sql)) {
        throw Object.assign(new Error('Raw query failed. Code: `42883`. Message: `ERROR: operator does not exist: text = uuid`'), {
          code: 'P2010',
        });
      }
      return [];
    });
  });

  it('binds member ids as text[] against message_threads.member_id (text)', async () => {
    const queue = await getInboxZeroQueue('counselor-user-1');

    expect(mocks.queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ids] = mocks.queryRawUnsafe.mock.calls[0];
    expect(sql).toMatch(/WHERE t\.member_id = ANY\(\$1::text\[\]\)/);
    expect(sql).not.toMatch(/::uuid\[\]/);
    expect(ids).toEqual(MEMBER_IDS);

    // With no counselor message on record every assigned member is overdue
    // for contact, so the queue lists all three instead of failing.
    expect(queue.totals.total).toBe(3);
    expect(queue.rows.map((r) => r.memberId).sort()).toEqual([...MEMBER_IDS].sort());
    expect(queue.rows.every((r) => r.primaryFlag === 'last_contact')).toBe(true);
  });
});
