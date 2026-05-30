import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  },
  NextResponse: class extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  },
}));

vi.mock('@/lib/auth/server', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth/roles', () => ({ isAdmin: vi.fn() }));
vi.mock('@/lib/content/programs', () => ({ getProgramBySlug: vi.fn(() => null) }));
vi.mock('@/lib/admin/fitScore', () => ({ calculateFitScore: vi.fn(() => 75) }));
vi.mock('@/lib/admin/healthScore', () => ({ calculateHealthStatus: vi.fn(() => 'active') }));
vi.mock('@/lib/admin/memberOnlyWhere', () => ({ MEMBER_OR_DOGFOOD_WHERE: {} }));
vi.mock('@/lib/formatPhone', () => ({ formatPhone: vi.fn((phone: string | null) => phone ?? '') }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn() }));

vi.mock('@/lib/csv/export', () => ({
  dataToCsv: vi.fn(() => 'Full Name,Email\nAlice Member,alice@example.com'),
  csvDownloadResponse: vi.fn(
    (csv: string, filename: string) =>
      new Response(csv, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${filename}"`,
        },
      }),
  ),
  exportFilename: vi.fn(() => 'members-2026-05-30.csv'),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn() },
    memberEvent: { groupBy: vi.fn() },
    courseProgress: { groupBy: vi.fn() },
    memberProgramProgress: { findMany: vi.fn() },
  },
}));

import { GET } from '@/app/api/admin/members/export/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { csvDownloadResponse } from '@/lib/csv/export';

describe('GET /api/admin/members/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'member-1',
        fullName: 'Alice Member',
        email: 'alice@example.com',
        phone: '5125550100',
        enrolledProgram: null,
        enrolledAt: null,
        assessmentScorePct: null,
        assessmentCompleted: false,
        programInterest: null,
        updatedAt: new Date('2026-05-01T00:00:00Z'),
        createdAt: new Date('2026-04-01T00:00:00Z'),
        courseEnrollments: [],
        profile: null,
        partnerReferrals: [],
      },
    ] as any);
    vi.mocked(prisma.memberEvent.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.courseProgress.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.memberProgramProgress.findMany).mockResolvedValue([]);
  });

  it('fails closed and does not return CSV when audit logging fails', async () => {
    vi.mocked(auditLog).mockRejectedValue(new Error('audit store down'));

    const res = await GET(new Request('http://localhost:3000/api/admin/members/export') as any);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'admin.export.members',
        targetType: 'MemberRoster',
      }),
    );
    expect(csvDownloadResponse).not.toHaveBeenCalled();
  });
});
