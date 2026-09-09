// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), admin: vi.fn(), superAdmin: vi.fn(), org: vi.fn(), find: vi.fn(), dispatch: vi.fn(), audit: vi.fn(), event: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: mocks.admin, isSuperAdmin: mocks.superAdmin }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: mocks.org }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: (fn: (db: unknown) => unknown) => fn({ milestoneCascade: { findFirst: mocks.find } }) } }));
vi.mock('@/lib/milestoneCascade/sendApprovedCascade', () => ({
  dispatchApprovedCascade: mocks.dispatch,
  CascadeDispatchError: class extends Error { constructor(message: string, public code: string, public status: number, public retryable: boolean) { super(message); } },
}));
vi.mock('@/lib/audit', () => ({ auditLog: mocks.audit }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: mocks.audit }));
vi.mock('@/lib/events/track', () => ({ trackEvent: mocks.event }));
import { POST } from '@/app/api/admin/milestone-cascades/[id]/approve/route';
import { CascadeDispatchError } from '@/lib/milestoneCascade/sendApprovedCascade';
const draft = { type: 'celebrate_milestone', channel: 'email', subject: 'Synthetic', body: 'Message', rationale: 'Milestone', confidence: 1 };
function row(status = 'awaiting_approval') { return { id: 'cascade-1', userId: 'member-1', status, drafts: [draft], expiresAt: new Date(Date.now() + 86400000), user: { email: 'member@example.invalid', organizationId: 'org-1', deletedAt: null } }; }
const request = (body = {}) => new NextRequest('http://localhost/api/admin/milestone-cascades/cascade-1/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: 'cascade-1' }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: 'staff-1' }); mocks.admin.mockResolvedValue(true); mocks.superAdmin.mockResolvedValue(false); mocks.org.mockResolvedValue('org-1');
  mocks.find.mockResolvedValue(row()); mocks.audit.mockResolvedValue(undefined); mocks.event.mockResolvedValue(undefined);
  mocks.dispatch.mockResolvedValue({ emailsSent: 1, emailsFailed: 0, advisoryCount: 0, outcomes: [], dispatch: { accepted: 1, failed: 0, uncertain: 0, pending: 0, advisory: 0, canRetry: false, canFinalize: true, retryAfter: null, blockedReason: null } });
});
describe('milestone approval/retry API', () => {
  it.each([401, 403])('rejects unauthorized requests before reading/sending: %s', async status => {
    if (status === 401) mocks.getUser.mockResolvedValue(null); else mocks.admin.mockResolvedValue(false);
    expect((await POST(request(), ctx)).status).toBe(status); expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('passes a tenant constraint through both lookup and dispatch', async () => {
    expect((await POST(request(), ctx)).status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cascade-1', user: { organizationId: 'org-1' } } }));
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ scopeWhere: { user: { organizationId: 'org-1' } }, approvedByUserId: 'staff-1', sourceDrafts: [draft] }));
  });
  it('does not dispatch for a deleted target member', async () => {
    mocks.find.mockResolvedValue({ ...row(), user: { ...row().user, deletedAt: new Date() } });
    expect((await POST(request(), ctx)).status).toBe(404); expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it('retries approved saved drafts without allowing edits to successful requests', async () => {
    mocks.find.mockResolvedValue(row('approved'));
    const edited = await POST(request({ editedDrafts: { 0: { subject: 'Changed' } } }), ctx);
    expect(edited.status).toBe(409); expect(mocks.dispatch).not.toHaveBeenCalled();
    expect((await POST(request({ editedDrafts: {} }), ctx)).status).toBe(200);
  });
  it('reports incomplete dispatch as failure and emits no sent event', async () => {
    mocks.dispatch.mockResolvedValue({ emailsSent: 1, emailsFailed: 1, advisoryCount: 0, dispatch: { accepted: 1, failed: 1, uncertain: 0, pending: 0, advisory: 0, canRetry: true } });
    const response = await POST(request(), ctx);
    expect(response.status).toBe(502); expect(await response.json()).toMatchObject({ ok: false, code: 'dispatch_incomplete', retryable: true, emailsSent: 1, emailsFailed: 1 });
    expect(mocks.event).not.toHaveBeenCalled();
  });
  it('preserves a persistence failure without writing a guessed dispatch_failed status', async () => {
    mocks.dispatch.mockRejectedValue(new CascadeDispatchError('Synthetic persistence failure', 'dispatch_persistence_failed', 503, true));
    const response = await POST(request(), ctx);
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: 'dispatch_persistence_failed', retryable: true });
    expect(mocks.event).not.toHaveBeenCalled();
  });
  it('rejects partially invalid stored drafts instead of shifting their retry indices', async () => {
    mocks.find.mockResolvedValue({ ...row(), drafts: [draft, { type: 'unknown' }] });
    expect((await POST(request(), ctx)).status).toBe(422); expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
