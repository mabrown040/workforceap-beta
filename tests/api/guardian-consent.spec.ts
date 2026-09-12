import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { courseraApprovalBlockedByConsent } from '@/lib/admin/courseraConsentGate';

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
  withApiGuc: (handler: any) => handler,
}));
vi.mock('@/lib/rate-limit', () => ({
  checkPublicQuestionnaireSubmitRateLimit: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }));
vi.mock('@/lib/audit/log', () => ({
  auditRequestMeta: vi.fn(() => ({})),
  logAuditEvent: vi.fn(async () => undefined),
}));

const db = vi.hoisted(() => {
  type Link = {
    id: string;
    token: string;
    type: 'guardian_consent' | 'interview_prep';
    subjectUserId: string | null;
    orgId: string | null;
    expiresAt: Date;
    consumedAt: Date | null;
  };
  type Profile = {
    userId: string;
    isMinor: boolean;
    parentalConsentGiven: boolean;
    parentGuardianName: string;
    parentGuardianEmail: string;
    parentGuardianPhone: string | null;
    parentalConsentDate: Date;
  };

  const state = {
    links: new Map<string, Link>(),
    profiles: new Map<string, Profile>(),
    failNextProfileWrite: false,
    profileWriteEffects: 0,
  };

  // Serialize synthetic transactions and restore both tables on failure. This
  // models the database guarantee the route must rely on without using real
  // minor, auth, provider, or production records.
  let queue = Promise.resolve();
  const transaction = vi.fn(async (fn: (tx: any) => Promise<unknown>) => {
    const run = queue.then(async () => {
      const linksBefore = new Map([...state.links].map(([key, value]) => [key, { ...value }]));
      const profilesBefore = new Map([...state.profiles].map(([key, value]) => [key, { ...value }]));
      const effectsBefore = state.profileWriteEffects;
      const tx = {
        tokenizedLink: {
          findUnique: vi.fn(async ({ where: { token } }: any) => state.links.get(token) ?? null),
          updateMany: vi.fn(async ({ where, data }: any) => {
            const link = [...state.links.values()].find((candidate) => candidate.id === where.id);
            const eligible = link
              && link.type === where.type
              && link.consumedAt === null
              && link.expiresAt.getTime() >= where.expiresAt.gte.getTime();
            if (!eligible) return { count: 0 };
            link.consumedAt = data.consumedAt;
            return { count: 1 };
          }),
        },
        profile: {
          upsert: vi.fn(async ({ where, create, update }: any) => {
            if (state.failNextProfileWrite) {
              state.failNextProfileWrite = false;
              throw new Error('synthetic profile write failure');
            }
            state.profileWriteEffects += 1;
            state.profiles.set(where.userId, state.profiles.has(where.userId) ? update : create);
            return state.profiles.get(where.userId);
          }),
        },
      };
      try {
        return await fn(tx);
      } catch (error) {
        state.links = linksBefore;
        state.profiles = profilesBefore;
        state.profileWriteEffects = effectsBefore;
        throw error;
      }
    });
    queue = run.then(() => undefined, () => undefined);
    return run;
  });

  return { state, transaction };
});

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: db.transaction },
}));

import { POST } from '@/app/api/consent/[token]/route';
import { checkPublicQuestionnaireSubmitRateLimit } from '@/lib/rate-limit';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

const postReq = (token: string, body: unknown) =>
  new Request(`http://localhost:3000/api/consent/${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  guardianName: 'Synthetic Guardian',
  guardianEmail: 'guardian@example.test',
  guardianPhone: '5550100',
  attested: true as const,
};

const submit = (token: string, body: unknown = validBody) =>
  POST(postReq(token, body) as any, { params: Promise.resolve({ token }) });

function addLink(overrides: Partial<{
  id: string;
  token: string;
  type: 'guardian_consent' | 'interview_prep';
  subjectUserId: string | null;
  orgId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
}> = {}) {
  const link = {
    id: 'link-1',
    token: 't'.repeat(32),
    type: 'guardian_consent' as const,
    subjectUserId: 'synthetic-minor-1',
    orgId: 'synthetic-org-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    ...overrides,
  };
  db.state.links.set(link.token, link);
  return link;
}

describe('POST /api/consent/[token]', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PRISMA_FLATTEN_TX', '0');
    vi.clearAllMocks();
    db.state.links.clear();
    db.state.profiles.clear();
    db.state.failNextProfileWrite = false;
    db.state.profileWriteEffects = 0;
    vi.mocked(checkPublicQuestionnaireSubmitRateLimit).mockResolvedValue({ success: true });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['preview', 'preview', '0'],
    ['development', 'development', '0'],
    ['explicit flatten override', 'production', '1'],
  ])('fails closed before database work when transactions are flattened in %s', async (_name, vercelEnv, flatten) => {
    vi.stubEnv('VERCEL_ENV', vercelEnv);
    vi.stubEnv('PRISMA_FLATTEN_TX', flatten);
    const link = addLink();
    const request = postReq(link.token, validBody);
    const parseBody = vi.spyOn(request, 'json');

    const response = await POST(request as any, { params: Promise.resolve({ token: link.token }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Guardian consent is temporarily unavailable. Please try again later.',
    });
    expect(parseBody).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.state.profileWriteEffects).toBe(0);
    expect(db.state.links.get(link.token)?.consumedAt).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid', {}, 410, 'This link is no longer valid.'],
    ['expired', { expiresAt: new Date(Date.now() - 60_000) }, 410, 'This link has expired.'],
    ['already used', { consumedAt: new Date() }, 410, 'This link has already been used.'],
    ['wrong type', { type: 'interview_prep' as const }, 410, 'This link is no longer valid.'],
  ])('returns the truthful terminal response for %s tokens without profile effects', async (_name, overrides, status, message) => {
    const token = _name === 'invalid' ? 'x'.repeat(32) : addLink(overrides).token;
    const response = await submit(token);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
    expect(db.state.profileWriteEffects).toBe(0);
  });

  it('rolls back token consumption on a forced profile-write failure so the same link can retry', async () => {
    const link = addLink();
    db.state.failNextProfileWrite = true;

    const failed = await submit(link.token);
    expect(failed.status).toBe(500);
    expect(db.state.links.get(link.token)?.consumedAt).toBeNull();
    expect(db.state.profiles.has('synthetic-minor-1')).toBe(false);

    const retried = await submit(link.token);
    expect(retried.status).toBe(200);
    expect(await retried.json()).toEqual({ ok: true });
    expect(db.state.links.get(link.token)?.consumedAt).toBeInstanceOf(Date);
    expect(db.state.profiles.get('synthetic-minor-1')).toEqual(expect.objectContaining({
      parentalConsentGiven: true,
      parentGuardianName: 'Synthetic Guardian',
    }));
  });

  it('allows exactly one concurrent submission and emits no duplicate downstream effects', async () => {
    const link = addLink();
    const responses = await Promise.all([submit(link.token), submit(link.token)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 410]);
    expect(db.state.profileWriteEffects).toBe(1);
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
  });

  it('persists consent that opens the existing downstream training-activation gate', async () => {
    const link = addLink();
    expect(courseraApprovalBlockedByConsent({ isMinor: true, parentalConsentGiven: false })).toBe(true);

    const response = await submit(link.token);
    expect(response.status).toBe(200);
    const profile = db.state.profiles.get('synthetic-minor-1');
    expect(profile).toBeDefined();
    expect(courseraApprovalBlockedByConsent(profile)).toBe(false);
  });

  it('rejects a submit that is not attested before starting a transaction', async () => {
    const link = addLink();
    const response = await submit(link.token, { ...validBody, attested: false });
    expect(response.status).toBe(400);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
