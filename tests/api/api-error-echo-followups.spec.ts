// @vitest-environment node
/**
 * Follow-ups the API error-echo sweep deferred. Each route below answered a
 * caught failure with the upstream error text (Prisma, the milestone
 * detector, the cascade dispatcher, the CSV ingest helpers) in the response
 * body; it must keep that text in the server log and answer the browser with
 * one stable `Unable to ...` sentence. Zod 400 messages are unchanged.
 *
 *  - POST /api/admin/milestone-cascades/synthetic       500 `{ error, detail: <error> }`
 *  - POST /api/admin/milestone-cascades/[id]/approve    500 `{ error, detail: <error> }`
 *  - POST /api/admin/milestone-cascades/[id]/dismiss    500 `{ error, detail: <error> }`
 *  - POST /api/admin/coursera/csv-import                500 `{ error: <ingest error> }`
 *
 * Sibling of tests/api/api-error-echo-sweep.spec.ts (real Request objects,
 * handler-level).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const fns = new Map<string, ReturnType<typeof vi.fn>>();
  const fn = (key: string) => {
    if (!fns.has(key)) fns.set(key, vi.fn(async () => null));
    return fns.get(key)!;
  };
  const model = (name: string) => new Proxy({}, { get: (_t, method: string) => fn(`${name}.${method}`) });
  const prisma: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return undefined;
        if (prop === '$transaction') {
          return async (arg: unknown) =>
            typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]);
        }
        return model(prop);
      },
    },
  );
  return {
    prisma,
    fn,
    reset: () => fns.clear(),
    detectCompletionMilestone: vi.fn(),
    dispatchApprovedCascade: vi.fn(),
    detectCourseraCsvKind: vi.fn(),
    parseCourseActivityCsv: vi.fn(),
    parseLearningPathActivityCsv: vi.fn(),
    ingestCourseActivityRows: vi.fn(),
    ingestLearningPathActivityRows: vi.fn(),
  };
});

vi.mock('next/server', () => {
  class MockNextRequest extends Request {
    get nextUrl() {
      return new URL(this.url);
    }
  }
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      });
    }
  }
  return { NextRequest: MockNextRequest, NextResponse: MockNextResponse, after: (fn: () => unknown) => void fn() };
});
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), getAll: vi.fn(() => []), set: vi.fn() })),
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('@/lib/db/withRequestGuc', () => ({
  withApiGuc: (handler: (...args: unknown[]) => Promise<Response>) => handler,
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: h.prisma }));
vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(async () => ({ id: 'staff-1', email: 'staff@example.com', user_metadata: {} })),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: vi.fn(async () => true),
  isSuperAdmin: vi.fn(async () => true),
}));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: vi.fn(async () => 'org-1') }));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({ logAuditEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/events/track', () => ({ trackEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/milestoneCascade/detectCompletionMilestone', () => ({
  detectCompletionMilestone: h.detectCompletionMilestone,
}));
vi.mock('@/lib/milestoneCascade/sendApprovedCascade', () => ({
  dispatchApprovedCascade: h.dispatchApprovedCascade,
  CascadeDispatchError: class CascadeDispatchError extends Error {
    constructor(message: string, public code: string, public status: number, public retryable: boolean) {
      super(message);
    }
  },
}));
vi.mock('@/lib/coursera/csvImport', () => ({
  detectCourseraCsvKind: h.detectCourseraCsvKind,
  parseCourseActivityCsv: h.parseCourseActivityCsv,
  parseLearningPathActivityCsv: h.parseLearningPathActivityCsv,
}));
vi.mock('@/lib/coursera/csvImport.server', () => ({
  ingestCourseActivityRows: h.ingestCourseActivityRows,
  ingestLearningPathActivityRows: h.ingestLearningPathActivityRows,
}));

import { POST as syntheticCascade } from '@/app/api/admin/milestone-cascades/synthetic/route';
import { POST as approveCascade } from '@/app/api/admin/milestone-cascades/[id]/approve/route';
import { POST as dismissCascade } from '@/app/api/admin/milestone-cascades/[id]/dismiss/route';
import { POST as csvImport } from '@/app/api/admin/coursera/csv-import/route';

const UPSTREAM = 'connect ECONNREFUSED db.internal:5432 (prisma) — invalid_api_key re_123 for https://api.upstream.example';

function req(url: string, body?: string, contentType = 'application/json'): any {
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function expectGeneric(res: Response, status: number, sentence: string) {
  expect(res.status).toBe(status);
  expect(res.headers.get('content-type') ?? '').toContain('application/json');
  const body = await res.json();
  expect(body.error).toBe(sentence);
  expect(body).not.toHaveProperty('detail');
  const text = JSON.stringify(body);
  expect(text).not.toContain('ECONNREFUSED');
  expect(text).not.toContain('db.internal');
  expect(text).not.toContain('invalid_api_key');
  expect(text).not.toContain('upstream.example');
}

const draft = { type: 'celebrate_milestone', channel: 'email', subject: 'Synthetic', body: 'Message', rationale: 'Milestone', confidence: 1 };
const cascadeRow = {
  id: 'cascade-1',
  userId: 'member-1',
  status: 'awaiting_approval',
  drafts: [draft],
  user: { email: 'member@example.com', organizationId: 'org-1', deletedAt: null },
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  h.reset();
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('milestone-cascade admin routes keep failure text server-side', () => {
  it('POST /api/admin/milestone-cascades/synthetic', async () => {
    h.fn('user.findFirst').mockResolvedValue({ id: 'staff-1' });
    h.detectCompletionMilestone.mockRejectedValue(new Error(UPSTREAM));
    const res = await syntheticCascade(req('/api/admin/milestone-cascades/synthetic', JSON.stringify({ completedCount: 1 })));
    await expectGeneric(res, 500, 'Unable to create the synthetic cascade. Please try again in a few minutes.');
    expect(consoleError).toHaveBeenCalledWith('[milestone-cascade synthetic] unhandled:', expect.any(Error));
  });

  it('POST /api/admin/milestone-cascades/synthetic keeps the zod 400', async () => {
    const res = await syntheticCascade(req('/api/admin/milestone-cascades/synthetic', JSON.stringify({ completedCount: 0 })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid data');
    expect(h.detectCompletionMilestone).not.toHaveBeenCalled();
  });

  it('POST /api/admin/milestone-cascades/[id]/approve', async () => {
    h.fn('milestoneCascade.findFirst').mockResolvedValue(cascadeRow);
    h.dispatchApprovedCascade.mockRejectedValue(new Error(UPSTREAM));
    const res = await approveCascade(req('/api/admin/milestone-cascades/cascade-1/approve', '{}'), params('cascade-1'));
    await expectGeneric(res, 500, 'Unable to approve this cascade. Please try again in a few minutes.');
    expect(consoleError).toHaveBeenCalledWith('[milestone-cascade approve] unhandled:', expect.any(Error));
  });

  it('POST /api/admin/milestone-cascades/[id]/dismiss', async () => {
    h.fn('milestoneCascade.findFirst').mockResolvedValue({ id: 'cascade-1', userId: 'member-1', status: 'awaiting_approval' });
    h.fn('milestoneCascade.updateMany').mockRejectedValue(new Error(UPSTREAM));
    const res = await dismissCascade(req('/api/admin/milestone-cascades/cascade-1/dismiss', JSON.stringify({ reason: 'test' })), params('cascade-1'));
    await expectGeneric(res, 500, 'Unable to dismiss this cascade. Please try again in a few minutes.');
    expect(consoleError).toHaveBeenCalledWith('[milestone-cascade dismiss] unhandled:', expect.any(Error));
  });
});

describe('POST /api/admin/coursera/csv-import keeps ingest failure text server-side', () => {
  const csv = 'Email,Course ID,Program Slug\nmember@example.com,course-1,program-1\n';

  it('course-activity ingest', async () => {
    h.detectCourseraCsvKind.mockReturnValue('course-activity');
    h.parseCourseActivityCsv.mockReturnValue([{ email: 'member@example.com' }]);
    h.ingestCourseActivityRows.mockRejectedValue(new Error(UPSTREAM));
    const res = await csvImport(req('/api/admin/coursera/csv-import', csv, 'text/csv'));
    await expectGeneric(res, 500, 'Unable to import the Coursera CSV right now. Please try again in a few minutes.');
    expect(consoleError).toHaveBeenCalledWith('[admin/coursera/csv-import] course-activity ingest failed:', expect.any(Error));
  });

  it('learning-path ingest', async () => {
    h.detectCourseraCsvKind.mockReturnValue('learning-path-activity');
    h.parseLearningPathActivityCsv.mockReturnValue([{ email: 'member@example.com' }]);
    h.ingestLearningPathActivityRows.mockRejectedValue(new Error(UPSTREAM));
    const res = await csvImport(req('/api/admin/coursera/csv-import', csv, 'text/csv'));
    await expectGeneric(res, 500, 'Unable to import the Coursera CSV right now. Please try again in a few minutes.');
    expect(consoleError).toHaveBeenCalledWith('[admin/coursera/csv-import] learning-path ingest failed:', expect.any(Error));
  });

  it('still answers a parse failure with its own 400 message', async () => {
    h.detectCourseraCsvKind.mockReturnValue('course-activity');
    h.parseCourseActivityCsv.mockImplementation(() => {
      throw new Error('Missing required column "Email"');
    });
    const res = await csvImport(req('/api/admin/coursera/csv-import', csv, 'text/csv'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Missing required column "Email"');
    expect(h.ingestCourseActivityRows).not.toHaveBeenCalled();
  });
});
