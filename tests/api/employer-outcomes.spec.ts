// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: Request };
});

vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (request: Request) => Promise<Response>) => handler,
}));
vi.mock('@/lib/auth/server', () => ({
  resolveAuthGucContext: vi.fn(async () => ({ userId: null, orgId: null, role: 'anonymous' })),
  getUser: vi.fn(async () => ({ id: 'employer-user-1' })),
}));
vi.mock('@/lib/auth/roles', () => ({ isEmployer: vi.fn(async () => true) }));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn(async () => 'org-1') }));
vi.mock('@/lib/audit/log', () => ({
  logAuditEvent: vi.fn(async () => undefined),
  auditRequestMeta: vi.fn(() => ({})),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));

/**
 * One synthetic employer with three postings and six applications. Every
 * Prisma method the mock exposes is derived from this same fixture, so the
 * route's response must come out identical whether it materialises rows
 * (the pre-aggregation implementation) or asks the database to count.
 */
const EMPLOYER_ID = 'employer-1';
const fixture = vi.hoisted(() => {
  const jobs = [
    { id: 'job-1', employerId: 'employer-1', title: 'Help Desk Analyst', status: 'live', applicationsCount: 3 },
    { id: 'job-2', employerId: 'employer-1', title: 'SOC Analyst', status: 'closed', applicationsCount: 3 },
    { id: 'job-3', employerId: 'employer-1', title: 'Field Technician', status: 'draft', applicationsCount: 0 },
    { id: 'job-other', employerId: 'employer-2', title: 'Not ours', status: 'live', applicationsCount: 9 },
  ];
  const users: Record<string, { id: string; fullName: string; enrolledProgram: string | null }> = {
    'u-1': { id: 'u-1', fullName: 'Synthetic One', enrolledProgram: 'cybersecurity-google' },
    'u-2': { id: 'u-2', fullName: 'Synthetic Two', enrolledProgram: 'cybersecurity-google' },
    'u-3': { id: 'u-3', fullName: 'Synthetic Three', enrolledProgram: 'it-support-professional-certificate' },
    'u-4': { id: 'u-4', fullName: 'Synthetic Four', enrolledProgram: null },
  };
  const applications = [
    { id: 'app-1', curatedJobId: 'job-1', userId: 'u-1', status: 'SAVED', createdAt: new Date('2026-09-01T00:00:00Z') },
    { id: 'app-2', curatedJobId: 'job-1', userId: 'u-2', status: 'ACCEPTED', createdAt: new Date('2026-09-02T00:00:00Z') },
    { id: 'app-3', curatedJobId: 'job-1', userId: 'u-3', status: 'PHONE_SCREEN', createdAt: new Date('2026-09-03T00:00:00Z') },
    { id: 'app-4', curatedJobId: 'job-2', userId: 'u-4', status: 'REJECTED', createdAt: new Date('2026-09-04T00:00:00Z') },
    { id: 'app-5', curatedJobId: 'job-2', userId: 'u-1', status: 'APPLIED', createdAt: new Date('2026-09-05T00:00:00Z') },
    { id: 'app-6', curatedJobId: 'job-2', userId: 'u-3', status: 'INTERVIEWING', createdAt: new Date('2026-09-06T00:00:00Z') },
    { id: 'app-other', curatedJobId: 'job-other', userId: 'u-2', status: 'ACCEPTED', createdAt: new Date('2026-09-07T00:00:00Z') },
  ];
  return { jobs, users, applications };
});

type Where = Record<string, any>;

const db = vi.hoisted(() => ({
  employerFindUnique: vi.fn(),
  jobFindMany: vi.fn(),
  jobCount: vi.fn(),
  jobGroupBy: vi.fn(),
  applicationFindMany: vi.fn(),
  applicationCount: vi.fn(),
  applicationGroupBy: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    employer: { findUnique: db.employerFindUnique },
    job: { findMany: db.jobFindMany, count: db.jobCount, groupBy: db.jobGroupBy },
    jobApplication: { findMany: db.applicationFindMany, count: db.applicationCount, groupBy: db.applicationGroupBy },
    $queryRaw: db.queryRaw,
  },
}));

import { GET } from '@/app/api/employer/outcomes/route';

function jobsFor(where: Where) {
  return fixture.jobs.filter((j) => {
    if (where.employerId && j.employerId !== where.employerId) return false;
    if (where.status && j.status !== where.status) return false;
    return true;
  });
}

function applicationsFor(where: Where) {
  const ownedJobIds = where.curatedJob?.employerId
    ? new Set(fixture.jobs.filter((j) => j.employerId === where.curatedJob.employerId).map((j) => j.id))
    : null;
  const idList = where.curatedJobId?.in ? new Set<string>(where.curatedJobId.in) : null;
  return fixture.applications.filter((a) => {
    if (ownedJobIds && !ownedJobIds.has(a.curatedJobId)) return false;
    if (idList && !idList.has(a.curatedJobId)) return false;
    if (where.status && a.status !== where.status) return false;
    if (where.status?.in && !where.status.in.includes(a.status)) return false;
    return true;
  });
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const out = new Map<string, number>();
  for (const row of rows) out.set(key(row), (out.get(key(row)) ?? 0) + 1);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.employerFindUnique.mockResolvedValue({ id: EMPLOYER_ID, companyName: 'Synthetic Employer', hiringPipelineActive: true });

  db.jobFindMany.mockImplementation(async (args: { where: Where; take?: number }) => {
    const rows = jobsFor(args.where);
    return typeof args.take === 'number' ? rows.slice(0, args.take) : rows;
  });
  db.jobCount.mockImplementation(async (args: { where: Where }) => jobsFor(args.where).length);
  db.jobGroupBy.mockImplementation(async (args: { by: string[]; where: Where }) => {
    const [field] = args.by;
    return [...countBy(jobsFor(args.where), (j) => (j as any)[field]).entries()].map(([value, count]) => ({
      [field]: value,
      _count: { _all: count },
    }));
  });

  db.applicationFindMany.mockImplementation(async (args: { where: Where; take?: number }) => {
    const rows = applicationsFor(args.where).map((a) => ({ ...a, user: fixture.users[a.userId] }));
    return typeof args.take === 'number' ? rows.slice(0, args.take) : rows;
  });
  db.applicationCount.mockImplementation(async (args: { where: Where }) => applicationsFor(args.where).length);
  db.applicationGroupBy.mockImplementation(async (args: { by: string[]; where: Where }) => {
    const [field] = args.by;
    return [...countBy(applicationsFor(args.where), (a) => (a as any)[field]).entries()].map(([value, count]) => ({
      [field]: value,
      _count: { _all: count },
    }));
  });

  // Simulates the per-program GROUP BY: one row per enrolled program (empty →
  // 'unknown'), alphabetical, for the applications on this employer's jobs.
  db.queryRaw.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join('?');
    expect(sql).toMatch(/GROUP BY/i);
    const employerId = values.find((v) => v === EMPLOYER_ID);
    const rows = applicationsFor({ curatedJob: { employerId } });
    const byProgram = new Map<string, { program: string; applications: number; hired: number }>();
    for (const a of rows) {
      const program = fixture.users[a.userId].enrolledProgram || 'unknown';
      const entry = byProgram.get(program) ?? { program, applications: 0, hired: 0 };
      entry.applications += 1;
      if (a.status === 'ACCEPTED') entry.hired += 1;
      byProgram.set(program, entry);
    }
    return [...byProgram.values()].sort((a, b) => a.program.localeCompare(b.program));
  });
});

const EXPECTED_RESPONSE = {
  employer: { companyName: 'Synthetic Employer', hiringPipelineActive: true },
  metrics: {
    totalJobs: 3,
    activeJobs: 1,
    totalApplications: 6,
    newApplications: 1,
    reviewedApplications: 2,
    hiredApplications: 1,
    rejectedApplications: 1,
    conversionRate: 17,
  },
  jobs: [
    { id: 'job-1', title: 'Help Desk Analyst', status: 'live', applications: 3 },
    { id: 'job-2', title: 'SOC Analyst', status: 'closed', applications: 3 },
    { id: 'job-3', title: 'Field Technician', status: 'draft', applications: 0 },
  ],
  programStats: [
    { name: 'cybersecurity-google', applications: 3, hired: 1, conversionRate: 33 },
    { name: 'it-support-professional-certificate', applications: 2, hired: 0, conversionRate: 0 },
    { name: 'unknown', applications: 1, hired: 0, conversionRate: 0 },
  ],
};

describe('GET /api/employer/outcomes', () => {
  it('returns the same metrics, job rows and program breakdown as the row-materialising implementation', async () => {
    const res = await GET(new Request('http://localhost/api/employer/outcomes') as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(EXPECTED_RESPONSE);
  });

  it('never materialises the application rows and only lists jobs with a bound', async () => {
    await GET(new Request('http://localhost/api/employer/outcomes') as any);

    expect(db.applicationFindMany).not.toHaveBeenCalled();
    expect(db.jobFindMany).toHaveBeenCalled();
    for (const [args] of db.jobFindMany.mock.calls) {
      expect(typeof args.take).toBe('number');
      expect(args.take).toBeGreaterThan(0);
    }

    // Aggregates are pushed to the database: per-status counts for jobs and
    // applications, and one GROUP BY for the per-program breakdown.
    expect(db.jobGroupBy.mock.calls.length + db.jobCount.mock.calls.length).toBeGreaterThan(0);
    expect(db.applicationGroupBy.mock.calls.length + db.applicationCount.mock.calls.length).toBeGreaterThan(0);
    expect(db.queryRaw).toHaveBeenCalledTimes(1);
  });

  it('scopes every aggregate to the employer that owns the postings', async () => {
    await GET(new Request('http://localhost/api/employer/outcomes') as any);
    for (const [args] of [...db.jobFindMany.mock.calls, ...db.jobGroupBy.mock.calls, ...db.jobCount.mock.calls]) {
      expect(args.where).toMatchObject({ employerId: EMPLOYER_ID });
    }
    for (const [args] of [...db.applicationGroupBy.mock.calls, ...db.applicationCount.mock.calls]) {
      expect(args.where).toMatchObject({ curatedJob: { employerId: EMPLOYER_ID } });
    }
    const [, ...values] = db.queryRaw.mock.calls[0];
    expect(values).toContain(EMPLOYER_ID);
  });
});
