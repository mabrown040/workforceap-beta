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
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/db/prisma', () => {
  const tx = {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    courseEnrollment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    prisma: {
      ...tx,
      __tx: tx,
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

import { POST } from '@/app/api/admin/members/[id]/enrollment-funding/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const MEMBER_ID = '550e8400-e29b-41d4-a716-446655440002';
const ORG_ID = '550e8400-e29b-41d4-a716-446655440003';

function request(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/admin/members/${MEMBER_ID}/enrollment-funding`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/members/[id]/enrollment-funding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: ADMIN_ID } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(getActorOrganizationId).mockResolvedValue(ORG_ID);
    (prisma as any).__tx.user.findFirst.mockResolvedValue({ id: MEMBER_ID });
    (prisma as any).__tx.user.update.mockResolvedValue({ id: MEMBER_ID });
  });

  it('rejects enrollment funding when no primary enrollment exists', async () => {
    (prisma as any).__tx.courseEnrollment.findFirst.mockResolvedValue(null);

    const response = await POST(request({ fundingSource: 'GRANT' }) as any, {
      params: Promise.resolve({ id: MEMBER_ID }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Create a primary program enrollment before saving funding details.',
    });
    expect((prisma as any).__tx.courseEnrollment.update).not.toHaveBeenCalled();
    expect((prisma as any).__tx.user.update).not.toHaveBeenCalled();
  });

  it('allows an honest workspace-only save without an enrollment', async () => {
    (prisma as any).__tx.courseEnrollment.findFirst.mockResolvedValue(null);

    const response = await POST(request({
      fundingSource: null,
      fundingNotes: null,
      workspaceEmail: 'member@workforceap.org',
      workspaceEmailProvisioned: true,
    }) as any, {
      params: Promise.resolve({ id: MEMBER_ID }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      enrollmentFundingSaved: false,
      workspaceSaved: true,
    });
    expect((prisma as any).__tx.user.update).toHaveBeenCalled();
  });
});
