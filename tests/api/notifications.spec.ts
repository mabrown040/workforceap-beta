import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
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
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ userId: null, orgId: null, profileRole: null })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isCounselor: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }),
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ─── Imports after mocks ───
import { GET as getNotifications } from '@/app/api/member/notifications/route';
import { PUT as markRead } from '@/app/api/member/notifications/[id]/read/route';
import { POST as dismissAll } from '@/app/api/member/notifications/dismiss-all/route';
import { POST as readAll } from '@/app/api/member/notifications/read-all/route';
import { DELETE as deleteNotification } from '@/app/api/member/notifications/[id]/route';
import { GET as getCounselorNotifications } from '@/app/api/counselor/notifications/route';
import { getUser } from '@/lib/auth/server';
import { isCounselor } from '@/lib/auth/roles';
import { prisma as _prisma } from '@/lib/db/prisma';
const prisma = _prisma as any;

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  otherUser: '550e8400-e29b-41d4-a716-446655440002',
  notifJobMatch: '550e8400-e29b-41d4-a716-446655440003',
  notifCounselor: '550e8400-e29b-41d4-a716-446655440004',
  notifCourse: '550e8400-e29b-41d4-a716-446655440005',
  notifSystem: '550e8400-e29b-41d4-a716-446655440006',
};

function makeNotification(overrides: Partial<{
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: UUIDS.notifJobMatch,
    userId: UUIDS.user,
    type: 'JOB_MATCH',
    title: 'New job match',
    body: 'We found a job that matches your skills.',
    data: null,
    readAt: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// GET /api/member/notifications
// ─────────────────────────────────────────────
describe('GET /api/member/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notifications for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const notifs = [
      makeNotification({ id: 'n1', type: 'JOB_MATCH', title: 'Job A' }),
      makeNotification({ id: 'n2', type: 'COUNSELOR_MESSAGE', title: 'Message from counselor', readAt: new Date() }),
    ];
    vi.mocked(prisma.notification.findMany).mockResolvedValue(notifs);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0].id).toBe('n1');
    expect(body.notifications[0].type).toBe('JOB_MATCH');
    expect(body.notifications[0].readAt).toBeNull();
    expect(body.notifications[1].readAt).toBeDefined();
    expect(body.unreadCount).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it('includes unread count', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(5);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unreadCount).toBe(5);
  });

  it('paginates results', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const page2Notifs = [makeNotification({ id: 'n3', title: 'Page 2' })];
    vi.mocked(prisma.notification.findMany).mockResolvedValue(page2Notifs);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(0);

    const req = new Request('http://localhost:3000/api/member/notifications?page=2&limit=10');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(0);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

// ─────────────────────────────────────────────
// PUT /api/member/notifications/[id]/read
// ─────────────────────────────────────────────
describe('PUT /api/member/notifications/[id]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks notification as read', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const notif = makeNotification({ id: UUIDS.notifJobMatch });
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(notif);
    vi.mocked(prisma.notification.update).mockResolvedValue({ ...notif, readAt: new Date() });

    const res = await markRead(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifJobMatch }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.notification.id).toBe(UUIDS.notifJobMatch);
    expect(body.notification.readAt).not.toBeNull();

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: UUIDS.notifJobMatch },
        data: { readAt: expect.any(Date) },
      })
    );
  });

  it('returns 404 for missing notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null);

    const res = await markRead(new Request('http://localhost'), { params: Promise.resolve({ id: 'missing-id' }) });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Notification not found' });
  });

  it('returns 403 for other members notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(
      makeNotification({ id: UUIDS.notifCounselor, userId: UUIDS.otherUser })
    );

    const res = await markRead(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifCounselor }) });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await markRead(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifJobMatch }) });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

// ─────────────────────────────────────────────
// POST /api/member/notifications/dismiss-all
// ─────────────────────────────────────────────
describe('POST /api/member/notifications/dismiss-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks all notifications as read', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 7 });
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(0);

    const res = await dismissAll({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.updatedCount).toBe(7);
    expect(body.unreadCount).toBe(0);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: UUIDS.user, readAt: null },
        data: { readAt: expect.any(Date) },
      })
    );
  });

  it('returns updated unread count', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 });
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(2);

    const res = await dismissAll({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updatedCount).toBe(3);
    expect(body.unreadCount).toBe(2);
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await dismissAll({} as any);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

// ─────────────────────────────────────────────
// PATCH /api/member/notifications/[id]/read
// ─────────────────────────────────────────────
describe('PATCH /api/member/notifications/[id]/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks notification as read via PATCH alias', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const notif = makeNotification({ id: UUIDS.notifJobMatch });
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(notif);
    vi.mocked(prisma.notification.update).mockResolvedValue({ ...notif, readAt: new Date() });

    const res = await markRead(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifJobMatch }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────
// DELETE /api/member/notifications/[id]
// ─────────────────────────────────────────────
describe('DELETE /api/member/notifications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes notification for owner', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    const notif = makeNotification({ id: UUIDS.notifJobMatch });
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(notif);
    vi.mocked(prisma.notification.delete).mockResolvedValue(notif);

    const res = await deleteNotification(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifJobMatch }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.notification.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: UUIDS.notifJobMatch } })
    );
  });

  it('returns 404 for missing notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null);

    const res = await deleteNotification(new Request('http://localhost'), { params: Promise.resolve({ id: 'missing-id' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 for other users notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(
      makeNotification({ id: UUIDS.notifCounselor, userId: UUIDS.otherUser })
    );

    const res = await deleteNotification(new Request('http://localhost'), { params: Promise.resolve({ id: UUIDS.notifCounselor }) });

    expect(res.status).toBe(403);
    expect(prisma.notification.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// POST /api/member/notifications/read-all
// ─────────────────────────────────────────────
describe('POST /api/member/notifications/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks all notifications as read via read-all alias', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(0);

    const res = await readAll({} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.updatedCount).toBe(5);
    expect(body.unreadCount).toBe(0);
  });
});

// ─────────────────────────────────────────────
// GET /api/counselor/notifications
// ─────────────────────────────────────────────
describe('GET /api/counselor/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notifications for counselor with filters', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      makeNotification({ id: 'cn1', type: 'course_complete', title: 'Member completed course' }),
    ]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

    const req = new Request('http://localhost:3000/api/counselor/notifications?limit=20&type=course_complete');
    const res = await getCounselorNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
  });

  it('returns 403 for non-counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const req = new Request('http://localhost:3000/api/counselor/notifications');
    const res = await getCounselorNotifications(req);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });
});

// ─────────────────────────────────────────────
// Notification types
// ─────────────────────────────────────────────
describe('Notification types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles job match notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      makeNotification({
        id: UUIDS.notifJobMatch,
        type: 'JOB_MATCH',
        title: 'New job match: Software Developer',
        body: 'Acme Corp is hiring a Software Developer that matches your profile.',
        data: { jobId: 'job-123', employerName: 'Acme Corp' },
      }),
    ]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications[0].type).toBe('JOB_MATCH');
    expect(body.notifications[0].data).toEqual({ jobId: 'job-123', employerName: 'Acme Corp' });
  });

  it('handles counselor message notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      makeNotification({
        id: UUIDS.notifCounselor,
        type: 'COUNSELOR_MESSAGE',
        title: 'New message from your counselor',
        body: 'Your counselor sent you a message about your resume.',
        data: { threadId: 'thread-456', counselorName: 'Sarah Johnson' },
      }),
    ]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications[0].type).toBe('COUNSELOR_MESSAGE');
    expect(body.notifications[0].title).toContain('counselor');
  });

  it('handles course completion notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      makeNotification({
        id: UUIDS.notifCourse,
        type: 'COURSE_COMPLETION',
        title: 'Course completed!',
        body: 'Congratulations on completing Digital Literacy Fundamentals.',
        data: { courseId: 'course-789', certificateUrl: '/certificates/789' },
      }),
    ]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(0);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications[0].type).toBe('COURSE_COMPLETION');
    expect(body.unreadCount).toBe(0);
  });

  it('handles system announcement notification', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      makeNotification({
        id: UUIDS.notifSystem,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Platform maintenance scheduled',
        body: 'WorkforceAP will be down for maintenance on Sunday 2-4 AM.',
        data: { maintenanceWindow: '2025-01-20T02:00:00Z' },
      }),
    ]);
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

    const req = new Request('http://localhost:3000/api/member/notifications');
    const res = await getNotifications(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications[0].type).toBe('SYSTEM_ANNOUNCEMENT');
    expect(body.notifications[0].title).toContain('maintenance');
    expect(body.unreadCount).toBe(1);
  });
});
