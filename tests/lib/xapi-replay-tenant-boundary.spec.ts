import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
  eventQueryRaw: vi.fn(),
  handle: vi.fn(),
  parse: vi.fn(),
  toRaw: vi.fn(),
  markProcessed: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $executeRaw: mocks.executeRaw,
    $transaction: mocks.transaction,
    xapiStatement: { findMany: mocks.findMany },
  },
}));
vi.mock('@/lib/xapi/inboundStatementPipeline', () => ({
  handleInboundParsedStatement: mocks.handle,
}));
vi.mock('@/lib/xapi/statements', () => ({
  parseXapiStatement: mocks.parse,
}));
vi.mock('@/lib/xapi/storage', () => ({
  markXapiStatementProcessed: mocks.markProcessed,
}));
vi.mock('@/lib/xapi/xapiStatementRowToRaw', () => ({
  xapiStatementRowToRawStatement: mocks.toRaw,
}));

import {
  replayPendingXapiStatements,
  replayUnresolvedXapiStatementsForIdentity,
} from '@/lib/coursera/replayPendingXapi';

const parsed = {
  email: 'learner@example.com',
  courseSlug: 'course-one',
  courseName: 'Course One',
  statementId: 'statement-1',
  verbId: 'http://adlnet.gov/expapi/verbs/completed',
  rawStatement: {},
};

describe('persisted xAPI replay tenant boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRaw.mockResolvedValue(0);
    mocks.transaction.mockImplementation(async (callback) => callback({
      xapiStatement: { findMany: mocks.findMany },
      $queryRaw: mocks.eventQueryRaw,
    }));
    mocks.findMany.mockResolvedValue([
      { id: 'row-1', statementId: 'statement-1', organizationId: 'org-a' },
    ]);
    mocks.eventQueryRaw.mockResolvedValue([{ status: 'completed' }]);
    mocks.toRaw.mockReturnValue({});
    mocks.parse.mockReturnValue(parsed);
    mocks.handle.mockResolvedValue({ completions: [{ ok: true }] });
    mocks.markProcessed.mockResolvedValue(undefined);
  });

  it('passes the statement tenant into every pending replay', async () => {
    const result = await replayPendingXapiStatements(10);

    expect(mocks.handle).toHaveBeenCalledWith(parsed, {
      organizationId: 'org-a',
      expectedUserId: null,
      requireOrganizationId: true,
    });
    expect(result.replayed).toBe(1);
    expect(result.skippedUnresolvedOrganization).toBe(0);

    const reconciliationSql = (mocks.executeRaw.mock.calls[0]?.[0] as TemplateStringsArray).join('');
    expect(reconciliationSql).toContain('u.deleted_at IS NULL');
    expect(reconciliationSql).toContain('cim.organization_id = u.organization_id');
    expect(reconciliationSql).toContain('conflicting_mapping.user_id <> cim.user_id');
    expect(reconciliationSql).toContain('direct_user.id <> cim.user_id');
  });

  it('retains sentinel rows for retry instead of replaying them unscoped', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'row-1',
        statementId: 'statement-1',
        organizationId: 'unresolved-row-1',
      },
    ]);

    const result = await replayPendingXapiStatements(10);

    expect(mocks.handle).not.toHaveBeenCalled();
    expect(mocks.markProcessed).not.toHaveBeenCalled();
    expect(result.replayed).toBe(0);
    expect(result.skippedUnresolvedOrganization).toBe(1);
  });

  it('threads reviewed tenant and user through identity-triggered replay', async () => {
    mocks.eventQueryRaw
      .mockResolvedValueOnce([{ statementId: 'statement-1' }])
      .mockResolvedValueOnce([{ status: 'completed' }]);

    await replayUnresolvedXapiStatementsForIdentity({
      courseraEmail: 'learner@example.com',
      organizationId: 'org-a',
      expectedUserId: 'user-a',
    });

    expect(mocks.handle).toHaveBeenCalledWith(parsed, {
      organizationId: 'org-a',
      expectedUserId: 'user-a',
      requireOrganizationId: true,
    });
    const statementQuery = mocks.findMany.mock.calls[0]?.[0];
    expect(statementQuery.where.organizationId).toBe('org-a');
  });
});
