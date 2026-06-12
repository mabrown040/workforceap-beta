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
  withApiGuc: vi.fn((handler: (request: Request) => Promise<Response>) => handler),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  getEmployerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { POST } from '@/app/api/employer/jobs/bulk-delete/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

const user = { id: '550e8400-e29b-41d4-a716-446655440001' };
const employerId = '550e8400-e29b-41d4-a716-446655440002';
const jobId = '550e8400-e29b-41d4-a716-446655440003';

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/employer/jobs/bulk-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/employer/jobs/bulk-delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue(user as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId } as any);
  });

  it('qualifies bulk delete mutation with deletable statuses', async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      { id: jobId, status: 'draft', title: 'Draft role' },
    ] as any);
    vi.mocked(prisma.job.deleteMany).mockResolvedValue({ count: 1 } as any);

    const res = await POST(makeRequest({ ids: [jobId], action: 'delete' }) as any);

    expect(res.status).toBe(200);
    expect(prisma.job.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [jobId] },
        employerId,
        status: { in: ['draft', 'pending', 'filled', 'closed'] },
      },
    });
  });

  it('returns conflict when bulk delete status guard skips a previously valid job', async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      { id: jobId, status: 'draft', title: 'Draft role' },
    ] as any);
    vi.mocked(prisma.job.deleteMany).mockResolvedValue({ count: 0 } as any);

    const res = await POST(makeRequest({ ids: [jobId], action: 'delete' }) as any);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'One or more jobs changed status. Refresh and try again.',
    });
  });

  it('qualifies bulk close mutation with closable statuses', async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      { id: jobId, status: 'live', title: 'Live role' },
    ] as any);
    vi.mocked(prisma.job.updateMany).mockResolvedValue({ count: 1 } as any);

    const res = await POST(makeRequest({ ids: [jobId], action: 'close' }) as any);

    expect(res.status).toBe(200);
    expect(prisma.job.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [jobId] },
        employerId,
        status: { in: ['live', 'approved'] },
      },
      data: { status: 'closed' },
    });
  });

  it('returns conflict when bulk close status guard skips a previously valid job', async () => {
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      { id: jobId, status: 'live', title: 'Live role' },
    ] as any);
    vi.mocked(prisma.job.updateMany).mockResolvedValue({ count: 0 } as any);

    const res = await POST(makeRequest({ ids: [jobId], action: 'close' }) as any);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'One or more jobs changed status. Refresh and try again.',
    });
  });
});
