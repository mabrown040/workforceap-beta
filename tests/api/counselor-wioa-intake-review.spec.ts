/**
 * Counselor approvals (Mike, 2026-09-19): counselors may mark a member's WIOA
 * intake verified / not verified for members assigned to them. They may not
 * record `not_eligible` — the eligibility determination belongs to the
 * workforce board. Admin path unchanged; members still 403.
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
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));
vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'test-user' })),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(() => Promise.resolve(false)),
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isCounselor: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('@/lib/counselor/staffMemberAccess', () => ({
  assertStaffCanAccessMemberRecord: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(() => Promise.resolve('org-1')),
}));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string | null, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));
vi.mock('@/lib/wioa/reviewSnapshot', () => ({
  recordWioaReviewSnapshot: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/audit/log', () => ({
  auditRequestMeta: vi.fn(() => ({ ip: 'test' })),
  logAuditEvent: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
  },
}));

import { PATCH } from '@/app/api/admin/members/[id]/wioa-review/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { logAuditEvent } from '@/lib/audit/log';
import { recordWioaReviewSnapshot } from '@/lib/wioa/reviewSnapshot';
import { prisma } from '@/lib/db/prisma';

const COUNSELOR = 'c0c0c0c0-0000-4000-8000-000000000001';
const ADMIN = 'a0a0a0a0-0000-4000-8000-000000000001';
const MEMBER_IN_SCOPE = 'f5636f0b-da40-43fe-9ed9-21db789ca076';
const MEMBER_OUT_OF_SCOPE = 'f5636f0b-da40-43fe-9ed9-21db789ca099';

const req = (memberId: string, body: unknown) =>
  new Request(`http://localhost/api/admin/members/${memberId}/wioa-review`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) });

function asCounselor() {
  vi.mocked(getUser).mockResolvedValue({ id: COUNSELOR } as never);
  vi.mocked(isAdmin).mockResolvedValue(false);
  vi.mocked(isSuperAdmin).mockResolvedValue(false);
  vi.mocked(isCounselor).mockResolvedValue(true);
  vi.mocked(assertStaffCanAccessMemberRecord).mockImplementation(async (_staffId, memberId) => memberId === MEMBER_IN_SCOPE);
}

function asAdmin() {
  vi.mocked(getUser).mockResolvedValue({ id: ADMIN } as never);
  vi.mocked(isAdmin).mockResolvedValue(true);
  vi.mocked(isSuperAdmin).mockResolvedValue(false);
  vi.mocked(isCounselor).mockResolvedValue(false);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findFirst).mockImplementation((async (args: any) => ({
    id: args?.where?.id,
    wioaQualificationJson: { answers: {}, signal: 'likely', reasons: [], submittedAt: '2026-09-01T00:00:00Z' },
  })) as never);
});

describe('PATCH /api/admin/members/[id]/wioa-review — counselor intake verification', () => {
  it('lets an assigned counselor mark intake verified for a member in their caseload', async () => {
    asCounselor();
    const res = await PATCH(req(MEMBER_IN_SCOPE, { status: 'verified', notes: 'Intake complete, documents on file' }), paramsFor(MEMBER_IN_SCOPE));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wioaReviewStatus).toBe('verified');
    expect(body.wioaReviewedByUserId).toBe(COUNSELOR);
    expect(assertStaffCanAccessMemberRecord).toHaveBeenCalledWith(COUNSELOR, MEMBER_IN_SCOPE);
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBER_IN_SCOPE },
        data: expect.objectContaining({ wioaReviewStatus: 'verified', wioaReviewedByUserId: COUNSELOR }),
      }),
    );
    expect(recordWioaReviewSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ userId: MEMBER_IN_SCOPE, decision: 'verified', actorUserId: COUNSELOR, source: 'wioa_review' }),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: COUNSELOR, role: 'counselor' }, verb: 'wioa_review' }),
    );
  });

  it('lets a counselor set intake back to not-yet-verified (pending)', async () => {
    asCounselor();
    const res = await PATCH(req(MEMBER_IN_SCOPE, { status: 'pending' }), paramsFor(MEMBER_IN_SCOPE));
    expect(res.status).toBe(200);
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ wioaReviewStatus: 'pending' }) }),
    );
  });

  it('refuses a counselor acting on a member outside their caseload (404, nothing changed)', async () => {
    asCounselor();
    const res = await PATCH(req(MEMBER_OUT_OF_SCOPE, { status: 'verified' }), paramsFor(MEMBER_OUT_OF_SCOPE));
    expect(res.status).toBe(404);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(recordWioaReviewSnapshot).not.toHaveBeenCalled();
  });

  it('does not let a counselor record an eligibility determination (not_eligible)', async () => {
    asCounselor();
    const res = await PATCH(req(MEMBER_IN_SCOPE, { status: 'not_eligible' }), paramsFor(MEMBER_IN_SCOPE));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/workforce board/i);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('still returns 403 for a plain member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'member-user' } as never);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isSuperAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);
    const res = await PATCH(req(MEMBER_IN_SCOPE, { status: 'verified' }), paramsFor(MEMBER_IN_SCOPE));
    expect(res.status).toBe(403);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('keeps the admin path unchanged (org-scoped, any status, no caseload check)', async () => {
    asAdmin();
    const res = await PATCH(req(MEMBER_OUT_OF_SCOPE, { status: 'not_eligible', notes: 'Board said no' }), paramsFor(MEMBER_OUT_OF_SCOPE));
    expect(res.status).toBe(200);
    expect(assertStaffCanAccessMemberRecord).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ wioaReviewStatus: 'not_eligible', wioaReviewedByUserId: ADMIN }) }),
    );
    expect(logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ user: { id: ADMIN, role: 'admin' } }));
  });
});
