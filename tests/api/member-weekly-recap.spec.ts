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
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    weeklyRecap: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/recap/generate', () => ({
  getWeekBounds: vi.fn(() => ({ start: new Date('2026-05-11'), end: new Date('2026-05-17') })),
  generateWeeklyRecap: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET, POST } from '@/app/api/member/weekly-recap/route';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { generateWeeklyRecap, getWeekBounds } from '@/lib/recap/generate';

describe('GET /api/member/weekly-recap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns existing recap for the current week', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.weeklyRecap.findUnique).mockResolvedValue({
      id: 'recap-1',
      userId: 'u1',
      weekStartDate: new Date('2026-05-11'),
      data: { applicationsAdded: 3, resourcesCompleted: 2 },
    } as any);

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recap.id).toBe('recap-1');
    expect(body.recap.data.applicationsAdded).toBe(3);
    expect(prisma.weeklyRecap.findUnique).toHaveBeenCalledWith({
      where: { userId_weekStartDate: { userId: 'u1', weekStartDate: new Date('2026-05-11') } },
    });
    expect(generateWeeklyRecap).not.toHaveBeenCalled();
  });

  it('generates new recap when none exists for the week', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.weeklyRecap.findUnique).mockResolvedValue(null);
    vi.mocked(generateWeeklyRecap).mockResolvedValue({
      id: 'recap-new',
      userId: 'u1',
      weekStartDate: new Date('2026-05-11'),
      data: { applicationsAdded: 1 },
    } as any);

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recap.id).toBe('recap-new');
    expect(generateWeeklyRecap).toHaveBeenCalledWith('u1', new Date('2026-05-11'));
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(prisma.weeklyRecap.findUnique).mockRejectedValue(new Error('DB error'));

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load weekly recap' });
  });

  it('returns 500 on unexpected outer error', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Auth failure'));

    const res = await GET(new Request('http://localhost'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/member/weekly-recap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await POST(new Request('http://localhost'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('generates fresh recap for the current week', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(generateWeeklyRecap).mockResolvedValue({
      id: 'recap-fresh',
      userId: 'u1',
      weekStartDate: new Date('2026-05-11'),
      data: { applicationsAdded: 5 },
    } as any);

    const res = await POST(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recap.id).toBe('recap-fresh');
    expect(generateWeeklyRecap).toHaveBeenCalledWith(
      'u1',
      new Date('2026-05-11'),
      new Date('2026-05-17')
    );
  });

  it('returns 500 when generation fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1', email: 'a@b.com' } as any);
    vi.mocked(generateWeeklyRecap).mockRejectedValue(new Error('Generation failed'));

    const res = await POST(new Request('http://localhost'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to generate weekly recap' });
  });

  it('returns 500 on unexpected outer error', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Auth failure'));

    const res = await POST(new Request('http://localhost'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
