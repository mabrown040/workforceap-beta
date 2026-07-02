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
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'admin-user' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn(),
}));

const tx = {
  onetOccupation: {
    upsert: vi.fn(),
  },
  careerProgramMapping: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    careerProgramMapping: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE, POST } from '@/app/api/admin/onet/mappings/route';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { getProgramBySlug } from '@/lib/content/programs';
import { auditLog } from '@/lib/audit';
import { prisma } from '@/lib/db/prisma';

const UUIDS = {
  admin: '550e8400-e29b-41d4-a716-446655440001',
  mapping: '550e8400-e29b-41d4-a716-446655440002',
};

const mapping = {
  id: UUIDS.mapping,
  onetCode: '15-1252.00',
  programSlug: 'it-support',
  priority: 1,
  experienceBand: 'beginner',
  recommendationType: 'primary',
  whyRecommended: null,
  isActive: true,
};

function makeRequest(body: Record<string, unknown>, method = 'POST') {
  return new Request('http://localhost:3000/api/admin/onet/mappings', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function upsertBody(overrides: Record<string, unknown> = {}) {
  return {
    onetCode: '15-1252.00',
    programSlug: 'it-support',
    priority: 1,
    experienceBand: 'beginner',
    recommendationType: 'primary',
    ...overrides,
  };
}

describe('/api/admin/onet/mappings mutation audit atomicity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.admin, email: 'admin@example.com' } as any);
    vi.mocked(requireAdmin).mockResolvedValue(undefined as any);
    vi.mocked(getProgramBySlug).mockReturnValue({ slug: 'it-support' } as any);
    vi.mocked(auditLog).mockResolvedValue(undefined);
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(tx));
    tx.onetOccupation.upsert.mockResolvedValue({});
    tx.careerProgramMapping.findUnique.mockResolvedValue(mapping);
    tx.careerProgramMapping.create.mockResolvedValue(mapping);
    tx.careerProgramMapping.update.mockResolvedValue(mapping);
    tx.careerProgramMapping.delete.mockResolvedValue(mapping);
  });

  it('creates mapping and audit entry in one transaction', async () => {
    const res = await POST(makeRequest(upsertBody()) as any);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.careerProgramMapping.create).toHaveBeenCalledOnce();
    expect(prisma.careerProgramMapping.create).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mapping_created',
        targetId: UUIDS.mapping,
      }),
      tx
    );
  });

  it('updates mapping and audit entry in one transaction', async () => {
    tx.careerProgramMapping.update.mockResolvedValue({ ...mapping, isActive: false });

    const res = await POST(makeRequest(upsertBody({ id: UUIDS.mapping, isActive: false })) as any);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.careerProgramMapping.update).toHaveBeenCalledOnce();
    expect(prisma.careerProgramMapping.update).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mapping_deactivated',
        targetId: UUIDS.mapping,
      }),
      tx
    );
  });

  it('deletes mapping and audit entry in one transaction', async () => {
    const res = await DELETE(makeRequest({ id: UUIDS.mapping }, 'DELETE') as any);

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.careerProgramMapping.delete).toHaveBeenCalledOnce();
    expect(prisma.careerProgramMapping.delete).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'mapping_deleted',
        targetId: UUIDS.mapping,
      }),
      tx
    );
  });

  it('returns 500 from transaction when audit write fails after create', async () => {
    vi.mocked(auditLog).mockRejectedValue(new Error('audit failed'));

    const res = await POST(makeRequest(upsertBody()) as any);

    expect(res.status).toBe(500);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.careerProgramMapping.create).toHaveBeenCalledOnce();
  });
});
