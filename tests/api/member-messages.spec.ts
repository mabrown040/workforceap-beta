import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(body), {
          ...init,
          headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
        }),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
    })
  ),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/supabaseCookieOptions', () => ({
  getSupabaseCookieOptions: vi.fn(() => ({})),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ userId: null, orgId: null, role: 'anonymous' })),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    messageThread: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    counselorAssignment: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        message: { create: vi.fn() },
        messageThread: { update: vi.fn() },
      };
      return fn(tx);
    }),
  },
}));

vi.mock('@/lib/messages/counselorThread', () => ({
  getOrCreateMemberCounselorThread: vi.fn(),
  assertMemberCanAccessThread: vi.fn(),
  normalizeMessageBody: vi.fn((raw: string) => {
    const body = raw.trim();
    if (!body) return { ok: false, error: 'Message cannot be empty' };
    if (body.length > 8000) return { ok: false, error: 'Message too long (max 8000 characters)' };
    return { ok: true, body };
  }),
  serializeMessage: vi.fn((m: any) => ({
    id: m.id,
    threadId: m.threadId,
    authorId: m.authorId ?? '',
    body: m.body,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  })),
}));

vi.mock('@/lib/messages/rateLimit', () => ({
  checkMessageRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET, POST, PATCH } from '@/app/api/member/messages/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  getOrCreateMemberCounselorThread,
  assertMemberCanAccessThread,
} from '@/lib/messages/counselorThread';
import { checkMessageRateLimit } from '@/lib/messages/rateLimit';
import { createNotification } from '@/lib/notifications/create';

const makeRequest = (body?: Record<string, unknown>) =>
  new Request('http://localhost:3000/api/member/messages', {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

describe('GET /api/member/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns message thread for authenticated member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
      memberLastReadAt: new Date('2026-05-01T00:00:00Z'),
      counselorLastReadAt: new Date('2026-05-02T00:00:00Z'),
    };

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      fullName: 'Counselor Alice',
    } as any);

    const res = await GET(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.thread.id).toBe('thread-1');
    expect(body.thread.memberId).toBe('user-123');
    expect(body.counselorName).toBe('Counselor Alice');
    expect(body.messages).toEqual([]);
  });

  it('includes message history with counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };

    const messages = [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        authorId: 'user-123',
        body: 'Hello counselor',
        createdAt: new Date('2026-05-10T10:00:00Z'),
      },
      {
        id: 'msg-2',
        threadId: 'thread-1',
        authorId: 'counselor-456',
        body: 'Hi Jane, how can I help?',
        createdAt: new Date('2026-05-10T10:05:00Z'),
      },
    ];

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue(messages as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      fullName: 'Counselor Alice',
    } as any);

    const res = await GET(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].body).toBe('Hello counselor');
    expect(body.messages[1].body).toBe('Hi Jane, how can I help?');
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);
    vi.mocked(getOrCreateMemberCounselorThread).mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(new Request('http://localhost'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('POST /api/member/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkMessageRateLimit).mockResolvedValue({ ok: true });
  });

  it('sends message to counselor successfully', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', fullName: 'Jane Doe', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
    };

    const createdMsg = {
      id: 'msg-new',
      threadId: 'thread-1',
      authorId: 'user-123',
      body: 'I need help with my resume',
      createdAt: new Date('2026-05-10T12:00:00Z'),
    };

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertMemberCanAccessThread).mockResolvedValue(true as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      return fn({
        message: { create: vi.fn().mockResolvedValue(createdMsg) },
        messageThread: { update: vi.fn().mockResolvedValue({}) },
      });
    });

    const res = await POST(makeRequest({ body: 'I need help with my resume' }) as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.body).toBe('I need help with my resume');

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'counselor-456',
        type: 'message',
        title: 'New message from Jane Doe',
        body: 'I need help with my resume',
        data: expect.objectContaining({ threadId: 'thread-1', memberId: 'user-123' }),
      })
    );
  });

  it('returns 400 for empty message', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const res = await POST(makeRequest({ body: '' }) as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Message cannot be empty');
  });

  it('returns 400 for whitespace-only message', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const res = await POST(makeRequest({ body: '   ' }) as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Message cannot be empty');
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ body: 'hello' }) as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when member cannot access thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
    };

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertMemberCanAccessThread).mockResolvedValue(null);

    const res = await POST(makeRequest({ body: 'hello' }) as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);
    vi.mocked(checkMessageRateLimit).mockResolvedValue({ ok: false, retryAfterMs: 45000 });

    const res = await POST(makeRequest({ body: 'hello' }) as any);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many messages');
    expect(res.headers.get('Retry-After')).toBe('45');
  });

  it('returns 400 for invalid JSON body', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const res = await POST(
      new Request('http://localhost:3000/api/member/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      }) as any
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);
    vi.mocked(getOrCreateMemberCounselorThread).mockRejectedValue(new Error('DB write failed'));

    const res = await POST(makeRequest({ body: 'hello' }) as any);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('PATCH /api/member/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks messages as read by updating memberLastReadAt', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
    };

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertMemberCanAccessThread).mockResolvedValue(true as any);
    vi.mocked(prisma.messageThread.update).mockResolvedValue({
      ...thread,
      memberLastReadAt: new Date('2026-05-10T12:00:00Z'),
    } as any);

    const res = await PATCH(new Request('http://localhost'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.memberLastReadAt).toBeDefined();
    expect(prisma.messageThread.update).toHaveBeenCalledWith({
      where: { id: 'thread-1' },
      data: { memberLastReadAt: expect.any(Date) },
    });
  });

  it('returns 401 for unauthenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await PATCH(new Request('http://localhost'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when member cannot access thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);

    const thread = {
      id: 'thread-1',
      memberId: 'user-123',
      counselorUserId: 'counselor-456',
    };

    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertMemberCanAccessThread).mockResolvedValue(null);

    const res = await PATCH(new Request('http://localhost'));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any);
    vi.mocked(getOrCreateMemberCounselorThread).mockRejectedValue(new Error('DB write failed'));

    const res = await PATCH(new Request('http://localhost'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
