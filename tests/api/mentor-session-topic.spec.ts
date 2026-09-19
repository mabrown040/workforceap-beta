// @vitest-environment node
/**
 * POST /api/mentors/[id]/sessions used to write the member's `topic` into the
 * `notes` column and leave `topic` (its own column on mentor_sessions, read
 * by lib/recap/generate.ts for the weekly recap) empty. Each field now lands
 * in its own column.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (...args: unknown[]) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (arg: any) => {
      const { prisma } = await import('@/lib/db/prisma');
      return typeof arg === 'function' ? arg(prisma) : Promise.all(arg);
    }),
    mentor: { findFirst: vi.fn() },
    mentorSession: { create: vi.fn(), findMany: vi.fn() },
  },
}));

import { POST as createMentorSession } from '@/app/api/mentors/[id]/sessions/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const MEMBER = { id: 'member-1', email: 'member@example.test' };
const MENTOR_ID = 'mentor-1';
const params = { params: Promise.resolve({ id: MENTOR_ID }) };

function post(body: Record<string, unknown>) {
  return createMentorSession(
    new Request(`http://localhost/api/mentors/${MENTOR_ID}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as any,
    params,
  );
}

function createdData() {
  const call = vi.mocked(prisma.mentorSession.create).mock.calls[0]?.[0] as { data: Record<string, unknown> } | undefined;
  expect(call).toBeDefined();
  return call!.data;
}

describe('POST /api/mentors/[id]/sessions stores topic and notes in their own columns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue(MEMBER as any);
    vi.mocked(prisma.mentor.findFirst).mockResolvedValue({ id: MENTOR_ID } as any);
    vi.mocked(prisma.mentorSession.create).mockImplementation((async ({ data }: any) => ({ id: 'session-1', ...data })) as any);
  });

  it('writes the form topic to `topic` and leaves `notes` empty', async () => {
    const res = await post({ scheduledAt: '2026-10-01T10:00', topic: 'Resume review before the interview' });
    expect(res.status).toBe(201);
    const data = createdData();
    expect(data.topic).toBe('Resume review before the interview');
    expect(data.notes).toBeNull();
    expect(data).toMatchObject({ mentorId: MENTOR_ID, memberId: MEMBER.id, status: 'PENDING', durationMin: 30 });
    const payload = (await res.json()) as { session: Record<string, unknown> };
    expect(payload.session.topic).toBe('Resume review before the interview');
  });

  it('keeps notes separate when a client sends both', async () => {
    const res = await post({ scheduledAt: '2026-10-01T10:00', topic: 'Mock interview', notes: 'Prefers evenings' });
    expect(res.status).toBe(201);
    const data = createdData();
    expect(data.topic).toBe('Mock interview');
    expect(data.notes).toBe('Prefers evenings');
  });

  it('stores null for a blank topic instead of an empty string', async () => {
    const res = await post({ scheduledAt: '2026-10-01T10:00', topic: '   ' });
    expect(res.status).toBe(201);
    const data = createdData();
    expect(data.topic).toBeNull();
    expect(data.notes).toBeNull();
  });

  it('rejects notes that are not a string', async () => {
    const res = await post({ scheduledAt: '2026-10-01T10:00', topic: 'x', notes: 42 });
    expect(res.status).toBe(400);
    expect(prisma.mentorSession.create).not.toHaveBeenCalled();
  });
});
