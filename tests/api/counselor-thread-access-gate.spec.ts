// @vitest-environment node
/**
 * Staff messaging routes must authorize against the MEMBER before they call
 * getOrCreateMemberCounselorThread. The thread-level check needs a thread id,
 * so checking only there meant a forbidden request still created a
 * message_threads row as a side effect of being refused.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));
vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(async () => false),
  isCounselor: vi.fn(async () => true),
  isSuperAdmin: vi.fn(async () => false),
  isAdminInOrg: vi.fn(async () => false),
}));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (...args: unknown[]) => Promise<Response>) => handler,
}));
vi.mock('@/lib/tenant/organization', () => ({
  getSubjectOrganizationId: vi.fn(async () => 'org-1'),
  getActorOrganizationId: vi.fn(async () => 'org-1'),
}));

const db = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userFindMany: vi.fn(async () => []),
  threadFindFirst: vi.fn(),
  messageFindMany: vi.fn(async () => []),
  transaction: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: db.userFindFirst, findMany: db.userFindMany },
    messageThread: { findFirst: db.threadFindFirst },
    message: { findMany: db.messageFindMany },
    $transaction: db.transaction,
  },
}));
vi.mock('@/lib/tenant/withTenantScope', async () => {
  const { prisma } = await import('@/lib/db/prisma');
  return { withTenantScope: (_orgId: string, fn: (d: unknown) => unknown) => fn(prisma) };
});

const gate = vi.hoisted(() => ({ member: vi.fn(), getOrCreate: vi.fn(), thread: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/counselor/staffMemberAccess', () => ({ assertStaffCanAccessMemberRecord: gate.member }));
vi.mock('@/lib/messages/counselorThread', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/messages/counselorThread')>();
  return {
    ...actual,
    getOrCreateMemberCounselorThread: gate.getOrCreate,
    assertStaffCanAccessThread: gate.thread,
    assertStaffCanPost: gate.post,
  };
});
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn(async () => null) }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => null) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => null) }));

import { GET as messagesGET, POST as messagesPOST } from '@/app/api/counselor/members/[memberId]/messages/route';
import { POST as nudgePOST } from '@/app/api/counselor/nudge/route';
import { POST as bulkFollowupPOST } from '@/app/api/counselor/bulk-followup/route';
import { getUser } from '@/lib/auth/server';

const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const THREAD = { id: 'thread-1', memberId: MEMBER_ID, counselorUserId: 'staff-1', memberLastReadAt: null, counselorLastReadAt: null };
const ctx = { params: Promise.resolve({ memberId: MEMBER_ID }) };

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ id: 'staff-1', email: 'staff@example.test' } as never);
  db.userFindFirst.mockResolvedValue({ id: MEMBER_ID, fullName: 'Member One', enrolledProgram: null, deletedAt: null });
  db.transaction.mockImplementation(async (fn: unknown) => (typeof fn === 'function' ? fn({ user: { findMany: db.userFindMany }, message: { findMany: db.messageFindMany } }) : []));
  gate.getOrCreate.mockResolvedValue(THREAD);
  gate.thread.mockResolvedValue(THREAD);
  gate.post.mockResolvedValue(THREAD);
});

describe('staff who may not message a member never create that member thread', () => {
  it('GET /api/counselor/members/[memberId]/messages -> 403 without getOrCreate', async () => {
    gate.member.mockResolvedValue(false);
    const res = await messagesGET(new Request(`http://localhost/api/counselor/members/${MEMBER_ID}/messages`) as never, ctx);
    expect(res.status).toBe(403);
    expect(gate.getOrCreate).not.toHaveBeenCalled();
  });

  it('POST /api/counselor/members/[memberId]/messages -> 403 without getOrCreate', async () => {
    gate.member.mockResolvedValue(false);
    const res = await messagesPOST(jsonRequest(`http://localhost/api/counselor/members/${MEMBER_ID}/messages`, { body: 'hello' }), ctx);
    expect(res.status).toBe(403);
    expect(gate.getOrCreate).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('POST /api/counselor/nudge -> 403 without getOrCreate', async () => {
    gate.member.mockResolvedValue(false);
    const res = await nudgePOST(jsonRequest('http://localhost/api/counselor/nudge', { memberId: MEMBER_ID, templateId: 'check_in' }));
    expect(res.status).toBe(403);
    expect(gate.getOrCreate).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('POST /api/counselor/bulk-followup reports Forbidden per member without getOrCreate', async () => {
    gate.member.mockResolvedValue(false);
    db.userFindMany.mockResolvedValueOnce([{ id: MEMBER_ID, fullName: 'Member One', email: 'm@example.test', enrolledProgram: null }] as never);
    const res = await bulkFollowupPOST(jsonRequest('http://localhost/api/counselor/bulk-followup', { memberIds: [MEMBER_ID], templateId: 'check_in' }));
    const json = await res.json();
    expect(gate.getOrCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(json)).toContain('Forbidden');
  });
});

describe('an authorized counselor still reaches the thread', () => {
  it('GET returns the thread once the member-level gate passes', async () => {
    gate.member.mockResolvedValue(true);
    const res = await messagesGET(new Request(`http://localhost/api/counselor/members/${MEMBER_ID}/messages`) as never, ctx);
    expect(res.status).toBe(200);
    expect(gate.getOrCreate).toHaveBeenCalledWith(MEMBER_ID);
    const json = await res.json();
    expect(json.thread.id).toBe('thread-1');
  });
});
