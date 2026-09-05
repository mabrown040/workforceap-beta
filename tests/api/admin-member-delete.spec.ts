import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request, context: unknown) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  requireAdmin: vi.fn(),
  getProfileRole: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

const findFirst = vi.fn();
const update = vi.fn();

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn((_orgId: string, fn: (db: unknown) => Promise<unknown>) =>
    fn({
      user: { findFirst, update },
    }),
  ),
}));

const supabaseUpdateUserById = vi.fn().mockResolvedValue({ error: null });
const supabaseDeleteUser = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: { admin: { updateUserById: supabaseUpdateUserById, deleteUser: supabaseDeleteUser } },
  })),
}));

vi.mock('@/lib/db/withDbRetry', () => ({
  withDbRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit/log', () => ({
  auditRequestMeta: vi.fn(() => ({})),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/gdpr/deleteUserStorage', () => ({
  ACCOUNT_STORAGE_DELETE_FAILED:
    'Stored files could not be deleted. Account was not erased. Please try again or contact support.',
  MEMBER_RESUME_BUCKET: 'member-resumes',
  MEMBER_FILES_BUCKET: 'member-files',
  deleteUserStorageObjects: vi.fn(),
}));

import { POST } from '@/app/api/admin/members/[id]/delete/route';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { deleteUserStorageObjects } from '@/lib/gdpr/deleteUserStorage';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const MEMBER_ID = 'member-1';

function deleteReq() {
  return new Request(`http://localhost:3000/api/admin/members/${MEMBER_ID}/delete`, {
    method: 'POST',
  });
}

describe('POST /api/admin/members/[id]/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as never);
    vi.mocked(requireAdmin).mockResolvedValue(undefined as never);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-1');
    findFirst.mockResolvedValue({
      email: 'member@example.com',
      deletedAt: null,
      profile: { resumeOriginalPath: 'member-1/resume.pdf', resumeEnhancedPath: null },
      userCertifications: [{ proofUrl: 'cert-files/member-1/cert.pdf' }],
    });
    update.mockResolvedValue({ id: MEMBER_ID });
    vi.mocked(deleteUserStorageObjects).mockResolvedValue({ ok: true, deleted: [] });
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never);

    const res = await POST(deleteReq(), { params: Promise.resolve({ id: MEMBER_ID }) });

    expect(res.status).toBe(401);
    expect(deleteUserStorageObjects).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to delete the account the admin is signed in with', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: MEMBER_ID, email: 'admin@example.com' } as never);

    const res = await POST(deleteReq(), { params: Promise.resolve({ id: MEMBER_ID }) });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('account you are signed in with');
    expect(deleteUserStorageObjects).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('fails closed when member storage objects cannot be deleted', async () => {
    vi.mocked(deleteUserStorageObjects).mockResolvedValue({
      ok: false,
      error: 'storage timeout',
      deleted: [],
    });

    const res = await POST(deleteReq(), { params: Promise.resolve({ id: MEMBER_ID }) });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: 'Stored files could not be deleted. Account was not erased. Please try again or contact support.',
    });
    expect(update).not.toHaveBeenCalled();
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('deletes member-resumes and member-files before soft-deleting the row', async () => {
    const res = await POST(deleteReq(), { params: Promise.resolve({ id: MEMBER_ID }) });

    expect(res.status).toBe(200);
    // Soft delete locks the login (ban) so restore can bring it back; it must
    // never hard-delete the Supabase auth user (9/2/26 lockout report).
    expect(supabaseUpdateUserById).toHaveBeenCalledWith(MEMBER_ID, { ban_duration: '876600h' });
    expect(supabaseDeleteUser).not.toHaveBeenCalled();
    expect(deleteUserStorageObjects).toHaveBeenCalledWith(MEMBER_ID, {
      extraPaths: [
        { bucket: 'member-resumes', path: 'member-1/resume.pdf' },
        { bucket: 'member-files', path: 'cert-files/member-1/cert.pdf' },
      ],
    });
    expect(update).toHaveBeenCalled();
  });
});
