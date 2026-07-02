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
  cookies: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
}));

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'test-user' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  isSuperAdmin: vi.fn(() => Promise.resolve(false)),
  isAdmin: vi.fn(),
  isAdminInOrg: vi.fn(() => Promise.resolve(false)),
  isCounselor: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => {
  const profile = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };
  const user = {
    findUnique: vi.fn(),
  };
  const counselorAssignment = {
    findFirst: vi.fn(),
  };
  const memberNextBestAction = {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  };
  return { prisma: { $transaction: vi.fn(async (arg: any) => { const { prisma } = await import('@/lib/db/prisma'); return typeof arg === 'function' ? arg(prisma) : Promise.all(arg); }), profile, user, counselorAssignment, memberNextBestAction } };
});

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/content/programs', () => ({
  getProgramBySlug: vi.fn(),
}));

vi.mock('@/lib/ai/groq', () => ({
  chatCompletion: vi.fn(),
  isAIConfigured: vi.fn(),
}));

vi.mock('@/lib/ai/anthropicChat', () => ({
  claudeChat: vi.fn(),
  isAnthropicConfigured: vi.fn(),
}));

vi.mock('@/lib/ai/postProcess', () => ({
  cleanLongFormPlainText: vi.fn((text: string) => text.trim()),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkAIToolRateLimit: vi.fn(),
}));

vi.mock('@/lib/member/getMemberResumePlainText', () => ({
  getMemberResumePlainText: vi.fn(),
}));

vi.mock('@/lib/workflows/completeCareerOsActions', () => ({
  completeCareerOsResumeActions: vi.fn(),
}));

// ─── Imports after mocks ───
import { POST as generateResume } from '@/app/api/member/resume/generate/route';
import { GET as getResume } from '@/app/api/member/resume/route';
import { GET as getCounselorMemberResume } from '@/app/api/counselor/members/[memberId]/resume/route';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getProgramBySlug } from '@/lib/content/programs';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { claudeChat, isAnthropicConfigured } from '@/lib/ai/anthropicChat';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { getMemberResumePlainText } from '@/lib/member/getMemberResumePlainText';
import { completeCareerOsResumeActions } from '@/lib/workflows/completeCareerOsActions';
import { NextRequest } from 'next/server';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  counselor: '550e8400-e29b-41d4-a716-446655440002',
  admin: '550e8400-e29b-41d4-a716-446655440003',
};

function mockSupabaseAdmin(storageFn?: () => any) {
  const storage = storageFn?.() ?? {
    upload: vi.fn(() => ({ error: null })),
    createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
    download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('Mock resume text')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
  };
  vi.mocked(getSupabaseAdmin).mockReturnValue({ storage: { from: () => storage } } as any);
  return storage;
}

function mockUser(overrides: Partial<{ id: string; email: string; fullName: string; phone: string; enrolledProgram: string }> = {}) {
  return {
    id: UUIDS.user,
    email: 'member@example.com',
    fullName: 'Test Member',
    phone: '555-1234',
    enrolledProgram: 'cdl',
    ...overrides,
  };
}

function mockProfile(overrides: Partial<any> = {}) {
  return {
    userId: UUIDS.user,
    profilePhone: '555-1234',
    profileAddress: '123 Main St',
    profileLinkedin: 'linkedin.com/in/test',
    profileBio: 'Experienced professional',
    employmentStatus: 'unemployed',
    educationLevel: 'High School',
    resumeOriginalPath: null,
    resumeEnhancedPath: null,
    ...overrides,
  };
}

function mockProgram() {
  return {
    slug: 'cdl',
    title: 'Commercial Driver Training',
    categoryLabel: 'Transportation',
  };
}

function makeGenerateRequest(body?: object): any {
  return new Request('http://localhost:3000/api/member/resume/generate', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
  });
}

function makeGetResumeRequest(search?: string) {
  return new NextRequest(`http://localhost:3000/api/member/resume${search ?? ''}`);
}

function makeCounselorRequest(memberId: string) {
  return new NextRequest(`http://localhost:3000/api/counselor/members/${memberId}/resume`);
}

// ─────────────────────────────────────────────
// POST /api/member/resume/generate
// ─────────────────────────────────────────────
describe('POST /api/member/resume/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAnthropicConfigured).mockReturnValue(false);
    vi.mocked(isAIConfigured).mockReturnValue(false);
    vi.mocked(checkAIToolRateLimit).mockResolvedValue({ success: true });
    vi.mocked(getMemberResumePlainText).mockResolvedValue('');
    vi.mocked(getProgramBySlug).mockReturnValue(mockProgram() as any);
    vi.mocked(completeCareerOsResumeActions).mockResolvedValue({ completedCount: 0, actionIds: [] });
    mockSupabaseAdmin();
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 404 when user is not found', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'User not found' });
  });

  it('generates resume from member profile using Anthropic when configured', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(isAnthropicConfigured).mockReturnValue(true);
    vi.mocked(claudeChat).mockResolvedValue('# Test Member\n\n## Professional Summary\nExperienced professional');
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.resume).toContain('Test Member');
    expect(body.fallbackUsed).toBe(false);
    expect(body.path).toBe(`${UUIDS.user}/resume-enhanced.txt`);
    expect(claudeChat).toHaveBeenCalledWith(
      expect.stringContaining('expert resume writer'),
      expect.stringContaining('Name: Test Member'),
      expect.objectContaining({ maxTokens: 2000 })
    );
  });

  it('falls back to Groq when Anthropic is not configured', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(isAnthropicConfigured).mockReturnValue(false);
    vi.mocked(isAIConfigured).mockReturnValue(true);
    vi.mocked(chatCompletion).mockResolvedValue('# Test Member\n\n## Experience\nDriver at ABC Corp');
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fallbackUsed).toBe(false);
    expect(chatCompletion).toHaveBeenCalled();
  });

  it('uses fallback resume when AI is not configured', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fallbackUsed).toBe(true);
    expect(body.resume).toContain('Test Member');
  });

  it('uses fallback resume when AI returns empty response', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(isAnthropicConfigured).mockReturnValue(true);
    vi.mocked(claudeChat).mockResolvedValue('');
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallbackUsed).toBe(true);
  });

  it('uses fallback resume when Groq rate limit is exceeded', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(isAnthropicConfigured).mockReturnValue(false);
    vi.mocked(isAIConfigured).mockReturnValue(true);
    vi.mocked(checkAIToolRateLimit).mockResolvedValue({ success: false });
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallbackUsed).toBe(true);
  });

  it('handles missing profile data gracefully with fallback resume', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: null,
    } as any);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.fallbackUsed).toBe(true);
    // Fallback uses dbUser.fullName when available; 'WorkforceAP Member' only when fullName is null
    expect(body.resume).toContain('Test Member');
    expect(body.resume).toContain('Commercial Driver Training');
  });

  it('uses resumeBase from request body when provided', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(isAnthropicConfigured).mockReturnValue(true);
    vi.mocked(claudeChat).mockResolvedValue('# Enhanced Resume');
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    const res = await generateResume(makeGenerateRequest({ resumeBase: 'My original resume content' }));
    expect(res.status).toBe(200);
    expect(claudeChat).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('My original resume content'),
      expect.any(Object)
    );
  });

  it('returns 500 when Supabase storage upload fails', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    const storage = mockSupabaseAdmin(() => ({
      upload: vi.fn(() => ({ error: { message: 'Storage error' } })),
    }));

    const res = await generateResume(makeGenerateRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to save resume' });
  });

  it('completes career OS actions after successful generation', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser(),
      profile: mockProfile(),
    } as any);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);

    await generateResume(makeGenerateRequest());
    expect(completeCareerOsResumeActions).toHaveBeenCalledWith(UUIDS.user);
  });
});

// ─────────────────────────────────────────────
// GET /api/member/resume
// ─────────────────────────────────────────────
describe('GET /api/member/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMemberResumePlainText).mockResolvedValue('');
    mockSupabaseAdmin();
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await getResume(makeGetResumeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns resume metadata and enhanced text for authenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeOriginalPath: `${UUIDS.user}/resume-original.pdf`,
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    const storage = mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('# Test Member\n\n## Professional Summary\nExperienced professional\n\n## Experience\nDriver at ABC Corp\n\n## Education\nHigh School\n\n## Core Skills\nCommunication')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
    }));

    const res = await getResume(makeGetResumeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasOriginal).toBe(true);
    expect(body.hasEnhanced).toBe(true);
    expect(body.originalUrl).toBe('https://example.com/signed');
    expect(body.enhancedUrl).toBe('https://example.com/signed');
    expect(body.enhancedText).toContain('Professional Summary');
    expect(body.enhancedText).toContain('Experience');
    expect(body.enhancedText).toContain('Education');
    expect(body.enhancedText).toContain('Core Skills');
    expect(body.originalExt).toBe('pdf');
    expect(body.enhancedExt).toBe('txt');
  });

  it('returns empty metadata when no resume exists', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile() as any);

    const res = await getResume(makeGetResumeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasOriginal).toBe(false);
    expect(body.hasEnhanced).toBe(false);
    expect(body.originalUrl).toBeNull();
    expect(body.enhancedUrl).toBeNull();
    expect(body.enhancedText).toBeNull();
  });

  it('returns 403 when non-staff tries to access another member resume', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: 'other-user' }) as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(false);

    const res = await getResume(makeGetResumeRequest('?memberId=' + UUIDS.user));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('allows admin to access any member resume', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.admin }) as any);
    vi.mocked(isAdmin).mockResolvedValue(true);
    vi.mocked(isCounselor).mockResolvedValue(false);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('Admin view')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
    }));

    const res = await getResume(makeGetResumeRequest('?memberId=' + UUIDS.user));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasEnhanced).toBe(true);
  });

  it('allows assigned counselor to access member resume', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue({
      counselor: { userId: UUIDS.counselor },
    } as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('Counselor view')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
    }));

    const res = await getResume(makeGetResumeRequest('?memberId=' + UUIDS.user));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasEnhanced).toBe(true);
  });

  it('returns 403 when counselor is not assigned to member', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(isAdmin).mockResolvedValue(false);
    vi.mocked(isCounselor).mockResolvedValue(true);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue({
      counselor: { userId: 'different-counselor' },
    } as any);

    const res = await getResume(makeGetResumeRequest('?memberId=' + UUIDS.user));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('includes plain text when includePlainText param is set', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    vi.mocked(getMemberResumePlainText).mockResolvedValue('Plain text resume content');
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('Enhanced')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
    }));

    const res = await getResume(makeGetResumeRequest('?includePlainText=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resumePlainText).toBe('Plain text resume content');
    expect(getMemberResumePlainText).toHaveBeenCalledWith(UUIDS.user, 12000);
  });

  it('returns 502 when storage sign URL fails', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser() as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: null, error: { message: 'Bucket not found' } })),
    }));

    const res = await getResume(makeGetResumeRequest());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Storage is not configured. Create the member-resumes bucket in Supabase Storage.' });
  });
});

// ─────────────────────────────────────────────
// GET /api/counselor/members/[memberId]/resume
// ─────────────────────────────────────────────
describe('GET /api/counselor/members/[memberId]/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseAdmin();
  });

  it('returns 401 for unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await getCounselorMemberResume(makeCounselorRequest(UUIDS.user), { params: Promise.resolve({ memberId: UUIDS.user }) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns resume for assigned counselor', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeOriginalPath: `${UUIDS.user}/resume-original.pdf`,
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    // assertStaffCanAccessMemberRecord checks member org + counselor assignment internally
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ organizationId: 'org-1' } as any);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue({
      counselor: { userId: UUIDS.counselor },
    } as any);
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: { text: vi.fn(() => Promise.resolve('# Counselor View\n\n## Summary\nGood candidate')), arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))) }, error: null })),
    }));

    const res = await getCounselorMemberResume(makeCounselorRequest(UUIDS.user), { params: Promise.resolve({ memberId: UUIDS.user }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasOriginal).toBe(true);
    expect(body.hasEnhanced).toBe(true);
    expect(body.enhancedText).toContain('Counselor View');
  });

  it('returns 403 for unassigned counselor', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue(null);

    const res = await getCounselorMemberResume(makeCounselorRequest(UUIDS.user), { params: Promise.resolve({ memberId: UUIDS.user }) });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns empty metadata when member has no resume', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ organizationId: 'org-1' } as any);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue({
      counselor: { userId: UUIDS.counselor },
    } as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

    const res = await getCounselorMemberResume(makeCounselorRequest(UUIDS.user), { params: Promise.resolve({ memberId: UUIDS.user }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasOriginal).toBe(false);
    expect(body.hasEnhanced).toBe(false);
  });

  it('returns 502 when storage download fails', async () => {
    vi.mocked(getUser).mockResolvedValue(mockUser({ id: UUIDS.counselor }) as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ organizationId: 'org-1' } as any);
    vi.mocked(prisma.counselorAssignment.findFirst).mockResolvedValue({
      counselor: { userId: UUIDS.counselor },
    } as any);
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      ...mockProfile(),
      resumeEnhancedPath: `${UUIDS.user}/resume-enhanced.txt`,
    } as any);
    mockSupabaseAdmin(() => ({
      createSignedUrl: vi.fn(() => ({ data: { signedUrl: 'https://example.com/signed' }, error: null })),
      download: vi.fn(() => ({ data: null, error: { message: 'Download failed' } })),
    }));

    const res = await getCounselorMemberResume(makeCounselorRequest(UUIDS.user), { params: Promise.resolve({ memberId: UUIDS.user }) });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Could not load resume file' });
  });
});
