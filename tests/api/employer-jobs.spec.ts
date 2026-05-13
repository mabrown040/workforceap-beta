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
}));

vi.mock('@/lib/auth/roles', () => ({
  getEmployerForUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    employer: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tenant/withTenantScope', () => ({
  withTenantScope: vi.fn(async (_orgId: string, fn: (db: unknown) => Promise<unknown>) => {
    const { prisma } = await import('@/lib/db/prisma');
    return fn(prisma);
  }),
}));

vi.mock('@/lib/email', () => ({
  sendJobSubmittedEmail: vi.fn(),
}));

vi.mock('@/lib/events/track', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/observability/captureApiError', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/lib/employer/jobCreate', () => ({
  buildEmployerJobCreateData: vi.fn((_orgId, _employerId, data) => data),
  getRouteErrorDetails: vi.fn((error: unknown) => ({
    message: error instanceof Error ? error.message : 'Unknown error',
    code: undefined,
  })),
}));

vi.mock('@/lib/portal/workflowEvents', () => ({
  recordEmployerWorkflowEvent: vi.fn(),
}));

// ─── Imports after mocks ───
import { GET as listJobs, POST as createJob } from '@/app/api/employer/jobs/route';
import { GET as getJob, PATCH as updateJob } from '@/app/api/employer/jobs/[id]/route';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { sendJobSubmittedEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { buildEmployerJobCreateData } from '@/lib/employer/jobCreate';
import { NextRequest } from 'next/server';

const UUIDS = {
  user: '550e8400-e29b-41d4-a716-446655440001',
  employer: '550e8400-e29b-41d4-a716-446655440002',
  org: '550e8400-e29b-41d4-a716-446655440003',
  job1: '550e8400-e29b-41d4-a716-446655440004',
  job2: '550e8400-e29b-41d4-a716-446655440005',
};

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: UUIDS.job1,
    title: 'Software Engineer',
    description: 'Build software',
    location: 'Austin, TX',
    locationType: 'hybrid',
    jobType: 'fulltime',
    status: 'live',
    employerId: UUIDS.employer,
    organizationId: UUIDS.org,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    applications: [],
    ...overrides,
  };
}

function makeRequest(url: string, opts?: RequestInit) {
  return new NextRequest(url, opts);
}

// ─────────────────────────────────────────────
// POST /api/employer/jobs
// ─────────────────────────────────────────────
describe('POST /api/employer/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Job', description: 'Desc' }),
      })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is not an employer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);

    const res = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Job', description: 'Desc' }),
      })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden: employer access required' });
  });

  it('returns 400 when required fields are missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);

    const res = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('validates required fields (title, description, location)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);

    // Missing description
    const missingDesc = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Title', location: 'Austin' }),
      })
    );
    expect(missingDesc.status).toBe(400);

    // Missing title
    const missingTitle = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: 'Desc', location: 'Austin' }),
      })
    );
    expect(missingTitle.status).toBe(400);
  });

  it('creates a job posting for authenticated employer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      id: UUIDS.employer,
      companyName: 'Acme Inc',
      contactEmail: 'acme@example.com',
      organizationId: UUIDS.org,
    } as any);
    vi.mocked(prisma.job.create).mockResolvedValue(makeJob() as any);

    const payload = {
      title: 'Software Engineer',
      description: 'Build great software',
      location: 'Austin, TX',
      status: 'draft',
    };

    const res = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Software Engineer');

    expect(prisma.job.create).toHaveBeenCalled();
    expect(buildEmployerJobCreateData).toHaveBeenCalledWith(
      UUIDS.org,
      UUIDS.employer,
      expect.objectContaining(payload)
    );
  });

  it('sends email and tracks event when status is pending', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      id: UUIDS.employer,
      companyName: 'Acme Inc',
      contactEmail: 'acme@example.com',
      organizationId: UUIDS.org,
    } as any);
    vi.mocked(prisma.job.create).mockResolvedValue(makeJob({ status: 'pending' }) as any);

    const res = await createJob(
      makeRequest('http://localhost:3000/api/employer/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Software Engineer',
          description: 'Build software',
          status: 'pending',
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(sendJobSubmittedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        jobTitle: 'Software Engineer',
        companyName: 'Acme Inc',
        employerEmail: 'acme@example.com',
      })
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'employer_job_submitted_for_review' })
    );
  });
});

// ─────────────────────────────────────────────
// GET /api/employer/jobs
// ─────────────────────────────────────────────
describe('GET /api/employer/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await listJobs(makeRequest('http://localhost:3000/api/employer/jobs'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user has no employer context', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);

    const res = await listJobs(makeRequest('http://localhost:3000/api/employer/jobs'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden: employer access required' });
  });

  it("returns employer's job postings with application count", async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      id: UUIDS.employer,
      organizationId: UUIDS.org,
    } as any);
    vi.mocked(prisma.job.findMany).mockResolvedValue([
      makeJob({ id: UUIDS.job1, applications: [{ id: 'app-1' }, { id: 'app-2' }] }),
      makeJob({ id: UUIDS.job2, applications: [{ id: 'app-3' }] }),
    ] as any);

    const res = await listJobs(makeRequest('http://localhost:3000/api/employer/jobs'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveLength(2);
    expect(body[0].applicationsCount).toBe(2);
    expect(body[1].applicationsCount).toBe(1);
    expect(body[0].applications).toBeUndefined();
  });

  it('filters by status query parameter', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      id: UUIDS.employer,
      organizationId: UUIDS.org,
    } as any);
    vi.mocked(prisma.job.findMany).mockResolvedValue([makeJob({ status: 'live' })] as any);

    const res = await listJobs(
      makeRequest('http://localhost:3000/api/employer/jobs?filter=live')
    );
    expect(res.status).toBe(200);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employerId: UUIDS.employer,
          status: { in: ['live'] },
        }),
      })
    );
  });
});

// ─────────────────────────────────────────────
// GET /api/employer/jobs/[id]
// ─────────────────────────────────────────────
describe('GET /api/employer/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeParams = (id: string) => Promise.resolve({ id });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await getJob(
      makeRequest(`http://localhost:3000/api/employer/jobs/${UUIDS.job1}`),
      { params: makeParams(UUIDS.job1) }
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user has no employer context', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);

    const res = await getJob(
      makeRequest(`http://localhost:3000/api/employer/jobs/${UUIDS.job1}`),
      { params: makeParams(UUIDS.job1) }
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('returns job details for owned job', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(
      makeJob({
        applications: [
          { id: 'app-1', student: { id: 's1', fullName: 'Alice', email: 'alice@example.com' } },
        ],
      }) as any
    );

    const res = await getJob(
      makeRequest(`http://localhost:3000/api/employer/jobs/${UUIDS.job1}`),
      { params: makeParams(UUIDS.job1) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(UUIDS.job1);
    expect(body.applications).toHaveLength(1);
  });

  it('returns 404 for missing job', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(null);

    const res = await getJob(
      makeRequest(`http://localhost:3000/api/employer/jobs/${UUIDS.job1}`),
      { params: makeParams(UUIDS.job1) }
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Job not found' });
  });
});

// ─────────────────────────────────────────────
// PATCH /api/employer/jobs/[id]
// ─────────────────────────────────────────────
describe('PATCH /api/employer/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeParams = (id: string) => Promise.resolve({ id });

  function makePatchRequest(id: string, body: Record<string, unknown>) {
    return makeRequest(`http://localhost:3000/api/employer/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any);

    const res = await updateJob(makePatchRequest(UUIDS.job1, { title: 'Updated' }), {
      params: makeParams(UUIDS.job1),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user has no employer context', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue(null);

    const res = await updateJob(makePatchRequest(UUIDS.job1, { title: 'Updated' }), {
      params: makeParams(UUIDS.job1),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  it('updates job posting for authenticated employer', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(makeJob() as any);
    vi.mocked(prisma.job.update).mockResolvedValue(makeJob({ title: 'Updated Title' }) as any);

    const res = await updateJob(makePatchRequest(UUIDS.job1, { title: 'Updated Title' }), {
      params: makeParams(UUIDS.job1),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated Title');
  });

  it('returns 404 for missing job', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(null);

    const res = await updateJob(makePatchRequest(UUIDS.job1, { title: 'Updated' }), {
      params: makeParams(UUIDS.job1),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Job not found' });
  });

  it('returns 403/404 for other employers job (findFirst returns null)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(null);

    const res = await updateJob(makePatchRequest(UUIDS.job2, { title: 'Updated' }), {
      params: makeParams(UUIDS.job2),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Job not found' });
  });

  it('sends email when transitioning draft to pending', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: UUIDS.user } as any);
    vi.mocked(getEmployerForUser).mockResolvedValue({ employerId: UUIDS.employer } as any);
    vi.mocked(prisma.job.findFirst).mockResolvedValue(makeJob({ status: 'draft' }) as any);
    vi.mocked(prisma.job.update).mockResolvedValue(makeJob({ status: 'pending' }) as any);
    vi.mocked(prisma.employer.findUnique).mockResolvedValue({
      companyName: 'Acme Inc',
      contactEmail: 'acme@example.com',
    } as any);

    const res = await updateJob(makePatchRequest(UUIDS.job1, { status: 'pending' }), {
      params: makeParams(UUIDS.job1),
    });
    expect(res.status).toBe(200);
    expect(sendJobSubmittedEmail).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// DELETE /api/employer/jobs/[id] — NOT IMPLEMENTED
// ─────────────────────────────────────────────
describe('DELETE /api/employer/jobs/[id]', () => {
  it.skip('no DELETE handler exists in app/api/employer/jobs/[id]/route.ts', () => {});
});
