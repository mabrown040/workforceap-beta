/**
 * Counselor notes: the delete control must only be offered for the caller's
 * own notes. DELETE already 404s ("Note not found or not yours") for anyone
 * else's note; GET/POST now expose `canDelete` so the panel can hide the "×"
 * instead of letting it fail.
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
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(() => Promise.resolve(false)),
  isCounselor: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@/lib/counselor/staffMemberAccess', () => ({
  assertStaffCanAccessMemberRecord: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn(() => Promise.resolve('org-1')) }));
vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string | null, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/db/prisma', () => {
  const counselorNote = { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() };
  const user = { findFirst: vi.fn(() => Promise.resolve({ id: 'member-1' })) };
  return {
    prisma: {
      $transaction: vi.fn(async (arg: any) => {
        const { prisma } = await import('@/lib/db/prisma');
        return typeof arg === 'function' ? arg(prisma) : Promise.all(arg);
      }),
      counselorNote,
      user,
    },
  };
});

import { GET, POST, DELETE } from '@/app/api/counselor/members/[memberId]/notes/route';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';

const ME = 'c0c0c0c0-0000-4000-8000-000000000001';
const OTHER = 'c0c0c0c0-0000-4000-8000-000000000009';
const MEMBER = 'f5636f0b-da40-43fe-9ed9-21db789ca076';
const params = { params: Promise.resolve({ memberId: MEMBER }) };
const req = (method: string, body?: unknown) =>
  new Request(`http://localhost/api/counselor/members/${MEMBER}/notes`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;

const note = (id: string, authorId: string) => ({
  id,
  memberId: MEMBER,
  authorId,
  content: `note ${id}`,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  author: { fullName: authorId === ME ? 'Me' : 'Someone Else', email: `${authorId}@example.test` },
});

describe('counselor notes — author gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: ME, email: 'me@example.test' } as any);
  });

  it('GET marks only the caller’s own notes as deletable', async () => {
    vi.mocked(prisma.counselorNote.findMany).mockResolvedValue([note('n-mine', ME), note('n-theirs', OTHER)] as any);
    const res = await GET(req('GET'), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((n: any) => [n.id, n.canDelete])).toEqual([
      ['n-mine', true],
      ['n-theirs', false],
    ]);
    // Existing payload shape is preserved for the panel.
    expect(body[1].author.fullName).toBe('Someone Else');
  });

  it('POST returns the created note as deletable by its author', async () => {
    vi.mocked(prisma.counselorNote.create).mockResolvedValue(note('n-new', ME) as any);
    const res = await POST(req('POST', { content: 'hello' }), params);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('n-new');
    expect(body.canDelete).toBe(true);
  });

  it('DELETE still refuses someone else’s note and never deletes it', async () => {
    vi.mocked(prisma.counselorNote.findFirst).mockResolvedValue(null);
    const res = await DELETE(req('DELETE', { noteId: 'n-theirs' }), params);
    expect(res.status).toBe(404);
    expect(prisma.counselorNote.findFirst).toHaveBeenCalledWith({
      where: { id: 'n-theirs', memberId: MEMBER, authorId: ME },
    });
    expect(prisma.counselorNote.delete).not.toHaveBeenCalled();
  });

  it('DELETE removes the caller’s own note', async () => {
    vi.mocked(prisma.counselorNote.findFirst).mockResolvedValue(note('n-mine', ME) as any);
    vi.mocked(prisma.counselorNote.delete).mockResolvedValue(note('n-mine', ME) as any);
    const res = await DELETE(req('DELETE', { noteId: 'n-mine' }), params);
    expect(res.status).toBe(200);
    expect(prisma.counselorNote.delete).toHaveBeenCalledWith({ where: { id: 'n-mine' } });
  });
});
