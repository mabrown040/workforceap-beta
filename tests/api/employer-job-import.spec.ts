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

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
  resolveAuthGucContext: vi.fn(() => Promise.resolve({ role: 'authenticated', userId: 'user-1' })),
}));

vi.mock('@/lib/auth/roles', () => ({
  getEmployerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    employer: {
      findUnique: vi.fn(),
    },
    job: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkEmployerJobImportRateLimit: vi.fn(),
}));

vi.mock('@/lib/diagnostics', () => ({
  recordWorkflowDiagnostic: vi.fn(),
}));

vi.mock('@/lib/events/track', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/ai/parseJob', () => ({
  buildFallbackParsedJobFromScrape: vi.fn(),
  normalizeImportedParsedJob: vi.fn((job) => job),
  parseJobFromText: vi.fn(),
}));

vi.mock('@/lib/ai/atsProviders', () => ({
  detectProvider: vi.fn(() => null),
  fetchSubJobPageText: vi.fn(),
  getImportWaitForMs: vi.fn(() => 0),
  isKnownStructuredApiProvider: vi.fn(() => false),
  isLikelyJobDetailUrl: vi.fn(() => false),
  smartImportJobs: vi.fn(() => Promise.resolve({ provider: 'generic', jobs: [], errors: [], rawText: '' })),
}));

vi.mock('@/lib/employer/jobCreate', () => ({
  buildEmployerJobCreateData: vi.fn((_orgId, _employerId, data) => data),
  getRouteErrorDetails: vi.fn((error: unknown) => ({
    message: error instanceof Error ? error.message : 'Unknown error',
    code: undefined,
  })),
}));

import { POST } from '@/app/api/employer/jobs/import/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { checkEmployerJobImportRateLimit } from '@/lib/rate-limit';
import { fetchSubJobPageText, smartImportJobs } from '@/lib/ai/atsProviders';
import { trackEvent } from '@/lib/events/track';

function makeRequest(url: string) {
  return new Request('http://localhost:3000/api/employer/jobs/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, createDraft: false }),
  });
}

describe('POST /api/employer/jobs/import URL safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'employer@example.com' } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: 'employer-1' } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({ id: 'employer-1', organizationId: 'org-1' } as any);
    vi.mocked(checkEmployerJobImportRateLimit).mockResolvedValue({ success: true, remaining: 9 } as any);
  });

  it.each([
    'http://localhost:3000/internal',
    'http://127.0.0.1:3000/internal',
    'http://10.0.0.5/jobs',
    'http://169.254.169.254/latest/meta-data',
    'http://metadata.google.internal/computeMetadata/v1',
    'ftp://example.com/jobs',
  ])('rejects unsafe import URL %s before fetching', async (url) => {
    const res = await POST(makeRequest(url) as any);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Provide a valid public job posting URL.' });
    expect(fetchSubJobPageText).not.toHaveBeenCalled();
    expect(smartImportJobs).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
