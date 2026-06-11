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
      getAll: vi.fn(() => []),
    })
  ),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'test-user' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(),
  isCounselor: vi.fn(),
  requireAdminOrCounselor: vi.fn(),
  isSuperAdmin: vi.fn(),
  isAdminInOrg: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const counselor = {
    findFirst: vi.fn(),
  };
  const counselorAssignment = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  const counselorNote = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  const user = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  const message = {
    findMany: vi.fn(),
    create: vi.fn(),
  };
  const messageThread = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const memberEvent = {
    findMany: vi.fn(),
    create: vi.fn(),
    groupBy: vi.fn(),
  };
  const pointsTransaction = {
    findMany: vi.fn(),
  };
  const jobPostingApplication = {
    findMany: vi.fn(),
  };
  const aIJobMatch = {
    findMany: vi.fn(),
  };
  const courseProgress = {
    findMany: vi.fn(),
  };
  const memberProgramProgress = {
    findUnique: vi.fn(),
  };
  const courseraSkillsetProgress = {
    findMany: vi.fn(),
  };
  const atRiskAlert = {
    count: vi.fn(),
    findMany: vi.fn(),
  };
  const $queryRaw = vi.fn();
  const $queryRawUnsafe = vi.fn();
  const $executeRaw = vi.fn();
  const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      message: { create: vi.fn() },
      messageThread: { update: vi.fn() },
      memberEvent: { create: vi.fn() },
    };
    return fn(tx);
  });
  return {
    prisma: {
      counselor,
      counselorAssignment,
      counselorNote,
      user,
      message,
      messageThread,
      memberEvent,
      pointsTransaction,
      jobPostingApplication,
      aIJobMatch,
      courseProgress,
      memberProgramProgress,
      courseraSkillsetProgress,
      atRiskAlert,
      $queryRaw,
      $queryRawUnsafe,
      $executeRaw,
      $transaction,
    },
  };
});

vi.mock('@/lib/counselor/staffMemberAccess', () => ({
  assertStaffCanAccessMemberRecord: vi.fn(),
}));

vi.mock('@/lib/counselor/commandCenter', () => ({
  getCounselorCommandCenter: vi.fn(),
}));

vi.mock('@/lib/messages/counselorThread', () => ({
  getOrCreateMemberCounselorThread: vi.fn(),
  assertStaffCanAccessThread: vi.fn(),
  assertStaffCanPost: vi.fn(),
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

vi.mock('@/lib/tenant/organization', () => ({
  getActorOrganizationId: vi.fn(),
  getSubjectOrganizationId: vi.fn(),
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string | null, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

vi.mock('@/lib/member/points', () => ({
  getMemberPoints: vi.fn(),
}));

vi.mock('@/lib/member/memberProgramTrainingView', () => ({
  loadMemberProgramTrainingView: vi.fn(),
}));

vi.mock('@/lib/coursera/memberSkillsetProgress', () => ({
  loadMemberSkillsetProgress: vi.fn(),
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(),
}));

vi.mock('@/lib/content/courseraDiscoveredCatalog', () => ({
  DISCOVERED_COURSERA_PROGRAMS: {},
}));

vi.mock('@/lib/coursera/learnerProgress', () => ({
  fetchLearnerProgressFromB4B: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/lib/wioa/wioaQualification', () => ({
  parseWioaQualificationSnapshot: vi.fn(() => null),
}));

vi.mock('@/lib/email', () => ({
  sendInactiveNudgeEmail: vi.fn(),
}));

vi.mock('@/lib/counselor/nudgeTemplates', () => ({
  getTemplate: vi.fn((id: string) => ({
    id,
    label: 'Test template',
    body: 'Hi {{firstName}} — test message.',
  })),
  renderNudge: vi.fn(() => 'Hi there — test message.'),
}));

vi.mock('@/lib/notifications/create', () => ({
  createNotification: vi.fn(),
  createBulkNotifications: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as getDashboard } from '@/app/api/counselor/dashboard/route';
import { GET as getMemberDetail } from '@/app/api/counselor/members/[memberId]/route';
import {
  GET as getMessages,
  POST as postMessage,
  PATCH as patchMessages,
} from '@/app/api/counselor/members/[memberId]/messages/route';
import { POST as postNudge } from '@/app/api/counselor/nudge/route';
import { POST as postRemind } from '@/app/api/counselor/remind-member/route';
import { GET as getPlacements, POST as postPlacement } from '@/app/api/counselor/placements/route';
import { GET as getPipelineAtRiskStats } from '@/app/api/admin/pipeline/at-risk-stats/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';
import { getCounselorCommandCenter } from '@/lib/counselor/commandCenter';
import {
  getOrCreateMemberCounselorThread,
  assertStaffCanAccessThread,
  assertStaffCanPost,
} from '@/lib/messages/counselorThread';
import { getActorOrganizationId, getSubjectOrganizationId } from '@/lib/tenant/organization';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { loadMemberProgramTrainingView } from '@/lib/member/memberProgramTrainingView';
import { loadMemberSkillsetProgress } from '@/lib/coursera/memberSkillsetProgress';
import { getMemberPoints } from '@/lib/member/points';
import { createNotification } from '@/lib/notifications/create';

const UUIDS = {
  counselorUser: '550e8400-e29b-41d4-a716-446655440001',
  adminUser: '550e8400-e29b-41d4-a716-446655440002',
  memberUser: '550e8400-e29b-41d4-a716-446655440003',
  counselorId: '550e8400-e29b-41d4-a716-446655440004',
  threadId: '550e8400-e29b-41d4-a716-446655440005',
  orgId: '550e8400-e29b-41d4-a716-446655440006',
  noteId: '550e8400-e29b-41d4-a716-446655440007',
  messageId: '550e8400-e29b-41d4-a716-446655440008',
};

// ─── Helpers ───
function makeRequest(url: string, opts?: RequestInit): any {
  return new Request(url, { ...opts, headers: { 'content-type': 'application/json', ...(opts?.headers || {}) } });
}

// ─── GET /api/counselor/dashboard ───
describe('GET /api/counselor/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns assignments and stats for a counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);

    vi.mocked(prisma.counselor.findFirst).mockResolvedValue({
      id: UUIDS.counselorId,
      userId: UUIDS.counselorUser,
      partner: { name: 'WAP Central' },
    } as any);

    vi.mocked(prisma.counselorAssignment.findMany).mockResolvedValue([
      {
        id: 'assign-1',
        memberId: UUIDS.memberUser,
        member: {
          id: UUIDS.memberUser,
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          programInterest: 'it-support',
          enrolledProgram: 'comptia-a-plus',
          assessmentScorePct: 82,
          memberProgramProgress: [{ programSlug: 'comptia-a-plus', averagePercent: 65, coursesCompleted: 2 }],
        },
      },
    ] as any);

    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ count: BigInt(0) }] as any);
    vi.mocked(getCounselorCommandCenter).mockResolvedValue({
      needsReply: [],
      atRisk: [],
      interviewing: [],
      totals: { needsReplyCount: 0, atRiskCount: 0, interviewingCount: 0, slaBreachCount: 0 },
    });

    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignments).toHaveLength(1);
    expect(body.assignments[0].memberName).toBe('Jane Doe');
    expect(body.stats.totalMembers).toBe(1);
    expect(body.stats.enrolledCount).toBe(1);
    expect(body.commandCenter.totals.atRiskCount).toBe(0);
  });

  it('returns empty for admin with no counselor record', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.adminUser, email: 'admin@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);
    vi.mocked(getCounselorCommandCenter).mockResolvedValue({
      needsReply: [],
      atRisk: [],
      interviewing: [],
      totals: { needsReplyCount: 0, atRiskCount: 0, interviewingCount: 0, slaBreachCount: 0 },
    });

    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assignments).toEqual([]);
    expect(body.stats.totalMembers).toBe(0);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-counselor / non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);

    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when counselor record not found and not admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselor.findFirst).mockResolvedValue(null);

    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 500 on unexpected database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselor.findFirst).mockRejectedValue(new Error('DB connection lost'));

    const res = await getDashboard(new Request('http://localhost'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

// ─── GET /api/admin/pipeline/at-risk-stats as counselor ───
describe('GET /api/admin/pipeline/at-risk-stats as counselor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes counts and pending counselor identities to assigned members', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.atRiskAlert.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    vi.mocked(prisma.atRiskAlert.findMany).mockResolvedValue([
      {
        user: {
          counselorAssignments: [
            {
              counselor: {
                user: { fullName: 'Counselor Jane', email: 'counselor@wap.org' },
              },
            },
          ],
        },
      },
    ] as any);

    const res = await getPipelineAtRiskStats(
      makeRequest('http://localhost:3000/api/admin/pipeline/at-risk-stats')
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.criticalCount).toBe(1);
    expect(body.alertsSentToday).toBe(1);
    expect(body.counselorsWithPending).toEqual([
      { name: 'Counselor Jane', email: 'counselor@wap.org', memberCount: 1 },
    ]);

    const counselorScope = {
      user: {
        counselorAssignments: {
          some: {
            active: true,
            counselor: { active: true, userId: UUIDS.counselorUser },
          },
        },
      },
    };

    expect(prisma.atRiskAlert.count).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining(counselorScope),
    });
    expect(prisma.atRiskAlert.count).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining(counselorScope),
    });
    expect(prisma.atRiskAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(counselorScope),
        select: expect.objectContaining({
          user: {
            select: {
              counselorAssignments: expect.objectContaining({
                where: {
                  active: true,
                  counselor: { active: true, userId: UUIDS.counselorUser },
                },
              }),
            },
          },
        }),
      })
    );
  });
});

// ─── GET /api/counselor/members/[memberId] ───
describe('GET /api/counselor/members/[memberId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMemberProgramTrainingView).mockReset();
    vi.mocked(loadMemberSkillsetProgress).mockReset();
    vi.mocked(getMemberPoints).mockReset();
  });

  it('returns full member detail for authorized counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: UUIDS.memberUser,
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      enrolledProgram: 'comptia-a-plus',
      programInterest: 'it-support',
      assessmentScorePct: 82,
      wioaQualificationJson: null,
      wioaReviewStatus: null,
      wioaReviewedAt: null,
      wioaReviewedByUserId: null,
      wioaReviewNotes: null,
      createdAt: new Date('2026-01-15'),
      profile: {
        resumeOriginalPath: null,
        resumeEnhancedPath: null,
        hasEmploymentBarrier: false,
        barrierTypes: [],
        profileBio: null,
      },
      courseEnrollments: [{ programSlug: 'comptia-a-plus', isPrimary: true, enrolledAt: new Date('2026-02-01') }],
    } as any);

    vi.mocked(prisma.jobPostingApplication.findMany).mockResolvedValue([]);
    vi.mocked(prisma.aIJobMatch.findMany).mockResolvedValue([]);
    vi.mocked(getMemberPoints).mockResolvedValue({ total: 120, level: 'explorer' } as any);
    vi.mocked(prisma.pointsTransaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.memberEvent.findMany).mockResolvedValue([]);
    vi.mocked(loadMemberSkillsetProgress).mockResolvedValue([]);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(loadMemberProgramTrainingView).mockResolvedValue(null);

    const res = await getMemberDetail(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.member.id).toBe(UUIDS.memberUser);
    expect(body.member.fullName).toBe('Jane Doe');
    expect(body.points.total).toBe(120);
    expect(body.thread.id).toBe(UUIDS.threadId);
    expect(body.messages).toEqual([]);
  });

  it('returns 404 when member not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await getMemberDetail(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Member not found');
  });

  it('returns 403 when counselor cannot access member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const res = await getMemberDetail(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getMemberDetail(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-counselor / non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await getMemberDetail(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});

// ─── GET /api/counselor/members/[memberId]/messages ───
describe('GET /api/counselor/members/[memberId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns thread and messages for authorized counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: UUIDS.memberUser, fullName: 'Jane Doe' } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanAccessThread).mockResolvedValue(true as any);

    vi.mocked(prisma.message.findMany).mockResolvedValue([
      {
        id: 'msg-1',
        threadId: UUIDS.threadId,
        authorId: UUIDS.memberUser,
        body: 'Hello counselor',
        createdAt: new Date('2026-05-10T10:00:00Z'),
      },
      {
        id: 'msg-2',
        threadId: UUIDS.threadId,
        authorId: UUIDS.counselorUser,
        body: 'Hi Jane!',
        createdAt: new Date('2026-05-10T10:05:00Z'),
      },
    ] as any);

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: UUIDS.memberUser, fullName: 'Jane Doe' },
      { id: UUIDS.counselorUser, fullName: 'Counselor Jane' },
    ] as any);

    const res = await getMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages'),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.thread.id).toBe(UUIDS.threadId);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].body).toBe('Hello counselor');
    expect(body.messages[1].body).toBe('Hi Jane!');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages'),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not counselor or admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await getMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages'),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when member not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await getMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages'),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Member not found');
  });

  it('returns 403 when counselor cannot access thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: UUIDS.memberUser, fullName: 'Jane Doe' } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanAccessThread).mockResolvedValue(false as any);

    const res = await getMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages'),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});

// ─── POST /api/counselor/members/[memberId]/messages ───
describe('POST /api/counselor/members/[memberId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a message in the member thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: UUIDS.memberUser } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanPost).mockResolvedValue(true as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: vi.fn().mockResolvedValue({
            id: UUIDS.messageId,
            threadId: UUIDS.threadId,
            authorId: UUIDS.counselorUser,
            body: 'Great progress!',
            createdAt: new Date('2026-05-10T12:00:00Z'),
          }),
        },
        messageThread: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Great progress!' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.body).toBe('Great progress!');

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: UUIDS.memberUser,
        type: 'message',
        title: 'New message from your advisor',
        body: 'Great progress!',
        data: expect.objectContaining({ threadId: UUIDS.threadId, authorId: UUIDS.counselorUser }),
      })
    );
  });

  it('returns 400 for empty message body', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: '' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Message cannot be empty');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Test' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not counselor or admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Test' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when member not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Test' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Member not found');
  });

  it('returns 403 when counselor cannot post to thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: UUIDS.memberUser } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanPost).mockResolvedValue(false as any);

    const res = await postMessage(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'Test' }),
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});

// ─── PATCH /api/counselor/members/[memberId]/messages ───
describe('PATCH /api/counselor/members/[memberId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks thread as read for counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: UUIDS.memberUser } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanAccessThread).mockResolvedValue(true as any);
    vi.mocked(prisma.messageThread.update).mockResolvedValue({} as any);

    const res = await patchMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.counselorLastReadAt).toBeDefined();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await patchMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not counselor or admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await patchMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when member not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await patchMessages(
      makeRequest('http://localhost:3000/api/counselor/members/' + UUIDS.memberUser + '/messages', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ memberId: UUIDS.memberUser }) }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Member not found');
  });
});

// ─── POST /api/counselor/nudge ───
describe('POST /api/counselor/nudge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a templated nudge to a member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: UUIDS.memberUser,
      fullName: 'Jane Doe',
      enrolledProgram: 'comptia-a-plus',
      deletedAt: null,
    } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanPost).mockResolvedValue(true as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: vi.fn().mockResolvedValue({
            id: UUIDS.messageId,
            threadId: UUIDS.threadId,
            authorId: UUIDS.counselorUser,
            body: 'Hi there — test message.',
            createdAt: new Date('2026-05-10T12:00:00Z'),
          }),
        },
        memberEvent: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ memberId: UUIDS.memberUser, templateId: 'check_in' }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message.body).toBe('Hi there — test message.');
  });

  it('returns 400 for missing memberId', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'check_in' }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('memberId required');
  });

  it('returns 400 for invalid templateId', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ memberId: UUIDS.memberUser, templateId: 'invalid' }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('valid templateId required');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ memberId: UUIDS.memberUser, templateId: 'check_in' }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when member not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ memberId: UUIDS.memberUser, templateId: 'check_in' }),
      })
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Member not found');
  });

  it('returns 403 when counselor cannot post to thread', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: UUIDS.memberUser,
      fullName: 'Jane Doe',
      enrolledProgram: null,
      deletedAt: null,
    } as any);

    const thread = {
      id: UUIDS.threadId,
      memberId: UUIDS.memberUser,
      counselorUserId: UUIDS.counselorUser,
      memberLastReadAt: null,
      counselorLastReadAt: null,
    };
    vi.mocked(getOrCreateMemberCounselorThread).mockResolvedValue(thread as any);
    vi.mocked(assertStaffCanPost).mockResolvedValue(false as any);

    const res = await postNudge(
      makeRequest('http://localhost:3000/api/counselor/nudge', {
        method: 'POST',
        body: JSON.stringify({ memberId: UUIDS.memberUser, templateId: 'check_in' }),
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});

// ─── POST /api/counselor/remind-member ───
describe('POST /api/counselor/remind-member', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends reminder email and logs event', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      email: 'jane@example.com',
      fullName: 'Jane Doe',
    } as any);
    vi.mocked(sendInactiveNudgeEmail).mockResolvedValue({ ok: true });
    vi.mocked(prisma.$executeRaw).mockResolvedValue({} as any);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser, daysInactive: 14 }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(sendInactiveNudgeEmail).toHaveBeenCalledWith({ to: 'jane@example.com', fullName: 'Jane Doe' });
  });

  it('returns 502 when email fails but logs the action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      email: 'jane@example.com',
      fullName: 'Jane Doe',
    } as any);
    vi.mocked(sendInactiveNudgeEmail).mockResolvedValue({ ok: false, error: 'SMTP error' });
    vi.mocked(prisma.$executeRaw).mockResolvedValue({} as any);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser, daysInactive: 14 }),
      })
    );

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toContain('email failed');
  });

  it('returns 400 for missing userId', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Member ID required');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser, daysInactive: 14 }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when counselor cannot access member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser, daysInactive: 14 }),
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when member has no email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(getSubjectOrganizationId).mockResolvedValue(UUIDS.orgId);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ email: null, fullName: 'Jane Doe' } as any);

    const res = await postRemind(
      makeRequest('http://localhost:3000/api/counselor/remind-member', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser, daysInactive: 14 }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Member has no email on file');
  });
});

// ─── GET /api/counselor/placements ───
describe('GET /api/counselor/placements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns placements for counselor', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      {
        id: 'placement-1',
        user_id: UUIDS.memberUser,
        employer_name: 'TechCorp',
        job_title: 'Junior IT Support',
        member_email: 'jane@example.com',
      },
    ] as any);

    const res = await getPlacements(makeRequest('http://localhost:3000/api/counselor/placements'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.placements).toHaveLength(1);
    expect(body.placements[0].employer_name).toBe('TechCorp');
  });

  it('filters by memberId when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([] as any);

    const res = await getPlacements(
      makeRequest('http://localhost:3000/api/counselor/placements?memberId=' + UUIDS.memberUser)
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.placements).toEqual([]);
  });

  it('returns 403 when counselor cannot access member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const res = await getPlacements(
      makeRequest('http://localhost:3000/api/counselor/placements?memberId=' + UUIDS.memberUser)
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await getPlacements(makeRequest('http://localhost:3000/api/counselor/placements'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-counselor / non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await getPlacements(makeRequest('http://localhost:3000/api/counselor/placements'));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});

// ─── POST /api/counselor/placements ───
describe('POST /api/counselor/placements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a placement record', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(true);

    const mockPlacement = {
      id: 'placement-1',
      user_id: UUIDS.memberUser,
      employer_name: 'TechCorp',
      job_title: 'Junior IT Support',
      placed_at: new Date('2026-05-10'),
      salary_offered: 45000,
    };
    vi.mocked(prisma.$queryRaw).mockResolvedValue([mockPlacement] as any);
    vi.mocked(prisma.$executeRaw).mockResolvedValue({} as any);

    const res = await postPlacement(
      makeRequest('http://localhost:3000/api/counselor/placements', {
        method: 'POST',
        body: JSON.stringify({
          userId: UUIDS.memberUser,
          employerName: 'TechCorp',
          jobTitle: 'Junior IT Support',
          startDate: '2026-05-10',
          salaryOffered: 45000,
          programSlug: 'comptia-a-plus',
          notes: 'Great placement!',
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.placement.employer_name).toBe('TechCorp');
  });

  it('returns 400 for missing required fields', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);

    const res = await postPlacement(
      makeRequest('http://localhost:3000/api/counselor/placements', {
        method: 'POST',
        body: JSON.stringify({ userId: UUIDS.memberUser }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Member, employer, and job title are required');
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const res = await postPlacement(
      makeRequest('http://localhost:3000/api/counselor/placements', {
        method: 'POST',
        body: JSON.stringify({
          userId: UUIDS.memberUser,
          employerName: 'TechCorp',
          jobTitle: 'Junior IT Support',
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-counselor / non-admin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.memberUser, email: 'member@example.com' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await postPlacement(
      makeRequest('http://localhost:3000/api/counselor/placements', {
        method: 'POST',
        body: JSON.stringify({
          userId: UUIDS.memberUser,
          employerName: 'TechCorp',
          jobTitle: 'Junior IT Support',
        }),
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when counselor cannot access member', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.counselorUser, email: 'counselor@wap.org' } as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(assertStaffCanAccessMemberRecord).mockResolvedValue(false);

    const res = await postPlacement(
      makeRequest('http://localhost:3000/api/counselor/placements', {
        method: 'POST',
        body: JSON.stringify({
          userId: UUIDS.memberUser,
          employerName: 'TechCorp',
          jobTitle: 'Junior IT Support',
        }),
      })
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });
});
