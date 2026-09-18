import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  isSuperAdmin: vi.fn(),
  getOrg: vi.fn(),
  transaction: vi.fn(),
  userFindMany: vi.fn(),
  statementFindMany: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));
vi.mock('@/lib/db/withRequestGuc', () => ({ withApiGuc: (handler: unknown) => handler }));
vi.mock('@/lib/auth/server', () => ({ getUser: mocks.getUser }));
vi.mock('@/lib/auth/roles', () => ({
  isAdmin: mocks.isAdmin,
  isSuperAdmin: mocks.isSuperAdmin,
}));
vi.mock('@/lib/tenant/organization', () => ({ getActorOrganizationId: mocks.getOrg }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: mocks.transaction } }));

import { GET } from '@/app/api/admin/training-progress/items/route';

/**
 * The tenant gate on this route used `{ equals, mode: 'insensitive' }`, which
 * compiles to `ILIKE`, while the statement read below it matches
 * `actorEmail` against the *same* string as a literal equality. A `_`/`%`
 * pattern that merely ILIKE-matched some member of the caller's own
 * organization therefore cleared the gate, and the read then returned the
 * item-level statements belonging to the literal address — which can be
 * another tenant's learner. The gate must match the same address the read
 * uses.
 */
const PATTERN_ADDRESS = 'm_johnson@example.com';

function itemsRequest(email: string) {
  return new Request(
    `http://localhost/api/admin/training-progress/items?email=${encodeURIComponent(email)}&courseraCourseId=course-1`,
  );
}

const statementRow = {
  courseItemId: 'item-1',
  itemType: 'ITEM_TYPE_LECTURE',
  verb: 'http://adlnet.gov/expapi/verbs/completed',
  resultScoreScaled: 1,
  resultCompletion: true,
  resultSuccess: true,
  createdAt: new Date('2026-09-01T00:00:00Z'),
};

describe('GET /api/admin/training-progress/items tenant gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: 'admin-1' });
    mocks.isAdmin.mockResolvedValue(true);
    mocks.isSuperAdmin.mockResolvedValue(false);
    mocks.getOrg.mockResolvedValue('org-a');
    mocks.statementFindMany.mockResolvedValue([statementRow]);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: { findMany: mocks.userFindMany },
        xapiStatement: { findMany: mocks.statementFindMany },
      }),
    );
  });

  // The caller is an admin of org-a. `mrjohnson@…` is their own org's member,
  // which the pattern ILIKE-matches; `m_johnson@…` is the literal address the
  // statement read would then expose, and it is not in org-a at all.
  it('refuses a pattern that only ILIKE-matches an own-org neighbour and reads no statements', async () => {
    mocks.userFindMany.mockResolvedValue([
      { id: 'neighbour-user', email: 'mrjohnson@example.com' },
    ]);

    const response = await GET(itemsRequest(PATTERN_ADDRESS));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [], totals: { items: 0 } });
    expect(mocks.statementFindMany).not.toHaveBeenCalled();
  });

  it('ignores neighbour rows the pattern swept in and still serves the exact member', async () => {
    mocks.userFindMany.mockResolvedValue([
      { id: 'neighbour-user', email: 'mrjohnson@example.com' },
      { id: 'owner-user', email: 'm_johnson@example.com' },
    ]);

    const response = await GET(itemsRequest(PATTERN_ADDRESS));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      email: PATTERN_ADDRESS,
      items: [expect.objectContaining({ courseItemId: 'item-1', completed: true })],
    });
    expect(mocks.statementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorEmail: PATTERN_ADDRESS, courseId: 'course-1' }),
      }),
    );
  });

  it('still serves an ordinary exact address, case-insensitively, with a bounded gate read', async () => {
    mocks.userFindMany.mockResolvedValue([{ id: 'user-1', email: 'Learner@Example.com' }]);

    const response = await GET(itemsRequest('learner@example.com'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, email: 'learner@example.com' });
    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: {
        email: { equals: 'learner@example.com', mode: 'insensitive' },
        organizationId: 'org-a',
      },
      select: { id: true, email: true },
      take: 25,
    });
  });

  it('leaves the super-admin path ungated by the exact filter', async () => {
    mocks.isSuperAdmin.mockResolvedValue(true);

    const response = await GET(itemsRequest(PATTERN_ADDRESS));

    expect(response.status).toBe(200);
    expect(mocks.userFindMany).not.toHaveBeenCalled();
    expect(mocks.statementFindMany).toHaveBeenCalled();
  });
});
