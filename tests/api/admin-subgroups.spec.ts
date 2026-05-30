import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

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
  withApiGuc: (handler: (...args: any[]) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ requireAdmin: vi.fn(), isSuperAdmin: vi.fn() }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    partner: { findFirst: vi.fn() },
    subgroup: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { POST } from '@/app/api/admin/subgroups/route';
import { PATCH, DELETE } from '@/app/api/admin/subgroups/[id]/route';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

const ORG_A = 'org-a';
const ORG_B = 'org-b';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const LEADER_B_ID = '33333333-3333-4333-8333-333333333333';
const SUBGROUP_B_ID = '44444444-4444-4444-8444-444444444444';

function jsonReq(body: unknown) {
  return new Request('http://localhost:3000/api/admin/subgroups', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const ctx = (id = SUBGROUP_B_ID) => ({ params: Promise.resolve({ id }) });

describe('admin subgroup tenant mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: ADMIN_ID } as any);
    vi.mocked(isSuperAdmin).mockResolvedValue(false);
    vi.mocked(getActorOrganizationId).mockResolvedValue(ORG_A);
  });

  it('rejects creating a subgroup with a leader outside the actor organization', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: LEADER_B_ID, organizationId: ORG_B } as any);

    const res = await POST(jsonReq({ name: 'Outside', type: 'manager', leaderId: LEADER_B_ID }));

    expect(res.status).toBe(403);
    expect(prisma.subgroup.create).not.toHaveBeenCalled();
  });

  it('rejects patching a subgroup owned by another organization', async () => {
    vi.mocked(prisma.subgroup.findUnique).mockResolvedValue({
      id: SUBGROUP_B_ID,
      type: 'manager',
      leader: { organizationId: ORG_B },
    } as any);

    const res = await PATCH(jsonReq({ name: 'Changed' }), ctx());

    expect(res.status).toBe(403);
    expect(prisma.subgroup.update).not.toHaveBeenCalled();
  });

  it('rejects moving an in-tenant subgroup to an out-of-tenant leader', async () => {
    vi.mocked(prisma.subgroup.findUnique).mockResolvedValue({
      id: SUBGROUP_B_ID,
      type: 'manager',
      leader: { organizationId: ORG_A },
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: LEADER_B_ID, organizationId: ORG_B } as any);

    const res = await PATCH(jsonReq({ leaderId: LEADER_B_ID }), ctx());

    expect(res.status).toBe(403);
    expect(prisma.subgroup.update).not.toHaveBeenCalled();
  });

  it('rejects deleting a subgroup owned by another organization', async () => {
    vi.mocked(prisma.subgroup.findUnique).mockResolvedValue({
      id: SUBGROUP_B_ID,
      type: 'manager',
      leader: { organizationId: ORG_B },
    } as any);

    const res = await DELETE(new Request('http://localhost:3000/api/admin/subgroups/id') as unknown as NextRequest, ctx());

    expect(res.status).toBe(403);
    expect(prisma.subgroup.delete).not.toHaveBeenCalled();
  });
});
