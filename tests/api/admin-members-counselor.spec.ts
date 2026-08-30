import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => ({
  NextRequest: class extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      }),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ userId: null, orgId: null, role: 'anonymous' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isSuperAdmin: vi.fn(() => Promise.resolve(false)), isAdmin: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendCounselorAssignedEmail: vi.fn().mockResolvedValue({ ok: true }) }));

vi.mock('@/lib/messages/counselorThread', () => ({
  getOrCreateMemberCounselorThread: vi.fn().mockResolvedValue({
    id: 'thread-1',
    memberId: 'member-1',
    counselorUserId: null,
  }),
}));

vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(async () => 'org-1'),
  getDefaultOrganizationId: vi.fn(async () => 'org-1'),
}));

vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    counselor: {
      findFirst: vi.fn(),
    },
    counselorAssignment: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 'assign-1' }),
    },
    $transaction: vi.fn(async (arg: any) => {
      const { prisma } = await import('@/lib/db/prisma');
      return typeof arg === 'function' ? arg(prisma) : Promise.all(arg);
    }),
    messageThread: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Imports after mocks ───
import { POST as assignCounselor } from '@/app/api/admin/members/[id]/counselor/route';
import { NextRequest } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications/create';
import { sendCounselorAssignedEmail } from '@/lib/email';

const UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  member: '550e8400-e29b-41d4-a716-446655440002',
  counselorUser: '550e8400-e29b-41d4-a716-446655440003',
  counselor: '550e8400-e29b-41d4-a716-446655440004',
  thread: '550e8400-e29b-41d4-a716-446655440005',
};

const makeRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost:3000/api/admin/members/${id}/counselor`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('POST /api/admin/members/[id]/counselor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates task_assigned notification when assigning a counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, fullName: 'Admin Bob' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: UUIDS.member,
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      organizationId: 'org-1',
    } as any);

    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({
      id: UUIDS.counselor,
      userId: UUIDS.counselorUser,
      active: true,
      user: { id: UUIDS.counselorUser, fullName: 'Counselor Alice' },
    } as any);

    vi.mocked(prisma.counselorAssignment.findUnique).mockResolvedValue(null);

    const res = await assignCounselor(
      makeRequest(UUIDS.member, { counselorUserId: UUIDS.counselorUser }),
      { params: Promise.resolve({ id: UUIDS.member }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.counselorName).toBe('Counselor Alice');
    expect(body.notificationEmailSent).toBe(true);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: UUIDS.member,
        type: 'task_assigned',
        title: 'You have a new advisor',
        body: 'Counselor Alice has been assigned as your career advisor.',
        data: expect.objectContaining({
          counselorId: UUIDS.counselor,
          counselorUserId: UUIDS.counselorUser,
          threadId: 'thread-1',
        }),
      })
    );
  });

  it('returns committed success with a warning when the assignment email fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, fullName: 'Admin Bob' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: UUIDS.member,
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      organizationId: 'org-1',
    } as any);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({
      id: UUIDS.counselor,
      userId: UUIDS.counselorUser,
      active: true,
      user: { id: UUIDS.counselorUser, fullName: 'Counselor Alice' },
    } as any);
    vi.mocked(prisma.counselorAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(sendCounselorAssignedEmail).mockResolvedValueOnce({ ok: false, error: 'provider down' });

    const res = await assignCounselor(
      makeRequest(UUIDS.member, { counselorUserId: UUIDS.counselorUser }),
      { params: Promise.resolve({ id: UUIDS.member }) },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.notificationEmailSent).toBe(false);
    expect(body.warning).toMatch(/assigned.*email was not sent/i);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await assignCounselor(
      makeRequest(UUIDS.member, { counselorUserId: UUIDS.counselorUser }),
      { params: Promise.resolve({ id: UUIDS.member }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    const res = await assignCounselor(
      makeRequest(UUIDS.member, { counselorUserId: UUIDS.counselorUser }),
      { params: Promise.resolve({ id: UUIDS.member }) }
    );
    expect(res.status).toBe(403);
  });
});
