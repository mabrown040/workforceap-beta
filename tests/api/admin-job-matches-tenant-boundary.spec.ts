import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init) } }));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/auth/server', () => ({ resolveAuthGucContext: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn(), isSuperAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(), crossTenantOK: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: { job: { findUnique: vi.fn() } } }));
vi.mock('@/lib/diagnostics', () => ({ recordWorkflowDiagnostic: vi.fn() }));
vi.mock('@/lib/admin/adminJobMatchesPrismaDeps', () => ({ createAdminJobMatchesPrismaDeps: vi.fn() }));
vi.mock('@/lib/admin/runAdminJobMatchesGet', () => ({ runAdminJobMatchesGet: vi.fn() }));

const { GET } = await import('@/app/api/admin/jobs/[id]/matches/route');
const { getUser } = await import('@/lib/auth/server');
const { isAdmin, isSuperAdmin } = await import('@/lib/auth/roles');
const { getActorOrganizationId } = await import('@/lib/tenant/organization');
const { withTenantScope } = await import('@/lib/tenant/withTenantScope');
const { prisma } = await import('@/lib/db/prisma');
const { createAdminJobMatchesPrismaDeps } = await import('@/lib/admin/adminJobMatchesPrismaDeps');
const { runAdminJobMatchesGet } = await import('@/lib/admin/runAdminJobMatchesGet');

describe('GET /api/admin/jobs/[id]/matches tenant boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-a' } as never);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isSuperAdmin).mockResolvedValue(false);
    vi.mocked(getActorOrganizationId).mockResolvedValue('org-a');
  });

  it('returns 404 before cached or uncached candidate access for another tenant', async () => {
    vi.mocked(withTenantScope).mockImplementation(async (_org, fn) => fn({ job: { findFirst: vi.fn().mockResolvedValue(null) } } as never) as never);
    const response = await GET(new Request('http://localhost') as never, { params: Promise.resolve({ id: 'foreign-job' }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Job not found' });
    expect(createAdminJobMatchesPrismaDeps).not.toHaveBeenCalled();
    expect(runAdminJobMatchesGet).not.toHaveBeenCalled();
  });

  it('allows explicit platform super-admin scope but binds work to the subject tenant', async () => {
    vi.mocked(isSuperAdmin).mockResolvedValue(true);
    vi.mocked(prisma.job.findUnique).mockResolvedValue({ id: 'job-b', organizationId: 'org-b' } as never);
    vi.mocked(createAdminJobMatchesPrismaDeps).mockReturnValue({} as never);
    vi.mocked(runAdminJobMatchesGet).mockResolvedValue({ status: 200, body: [] });
    const response = await GET(new Request('http://localhost') as never, { params: Promise.resolve({ id: 'job-b' }) });
    expect(response.status).toBe(200);
    expect(createAdminJobMatchesPrismaDeps).toHaveBeenCalledWith('org-b', expect.any(Function));
  });
});
