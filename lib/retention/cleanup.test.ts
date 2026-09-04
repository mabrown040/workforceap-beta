import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupTable, cleanupDeletedAccounts, runDataCleanup } from './cleanup';
import {
  RETENTION_TABLES,
  CRITICAL_AUDIT_ACTION_PREFIXES,
  CRITICAL_AUDIT_RETENTION_DAYS,
  getCutoffDate,
} from './config';

const mockDeleteMany = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    $transaction: async (arg: unknown) => {
      const { prisma } = await import('@/lib/db/prisma');
      return typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]);
    },
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    auditLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    xapiStatement: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    cronExecution: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    webhookEvent: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    memberEvent: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    workflowDiagnostic: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    portalWorkflowEvent: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

describe('cleanupTable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deletes expired rows in a single batch', async () => {
    mockFindMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    mockDeleteMany.mockResolvedValueOnce({ count: 2 });

    const cfg = RETENTION_TABLES.find((t) => t.model === 'auditLog')!;
    const result = await cleanupTable(cfg);

    expect(result.deleted).toBe(2);
    expect(result.batchCount).toBe(1);
    expect(result.model).toBe('auditLog');

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { createdAt: { lt: getCutoffDate(cfg.days) } },
            {
              OR: [
                { NOT: { OR: CRITICAL_AUDIT_ACTION_PREFIXES.map((prefix) => ({ action: { startsWith: prefix } })) } },
                { createdAt: { lt: getCutoffDate(CRITICAL_AUDIT_RETENTION_DAYS) } },
              ],
            },
          ],
        },
        select: { id: true },
        take: 1000,
        orderBy: { createdAt: 'asc' },
      }),
    );

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
    });
  });

  it('processes multiple batches until exhausted', async () => {
    // Batch 1: full
    mockFindMany
      .mockResolvedValueOnce(Array.from({ length: 1000 }, (_, i) => ({ id: `b1-${i}` })))
      .mockResolvedValueOnce(Array.from({ length: 500 }, (_, i) => ({ id: `b2-${i}` })))
      .mockResolvedValueOnce([]);

    mockDeleteMany
      .mockResolvedValueOnce({ count: 1000 })
      .mockResolvedValueOnce({ count: 500 });

    const cfg = RETENTION_TABLES.find((t) => t.model === 'cronExecution')!;
    const result = await cleanupTable(cfg);

    expect(result.deleted).toBe(1500);
    expect(result.batchCount).toBe(2);
  });

  it('returns zero when no rows match', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const cfg = RETENTION_TABLES.find((t) => t.model === 'webhookEvent')!;
    const result = await cleanupTable(cfg);

    expect(result.deleted).toBe(0);
    expect(result.batchCount).toBe(0);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it('throws for invalid model name', async () => {
    await expect(
      cleanupTable({ model: 'nonExistent', dateColumn: 'createdAt', days: 30, description: 'x' }),
    ).rejects.toThrow('Invalid Prisma model');
  });
});

describe('cleanupDeletedAccounts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('hard-deletes soft-deleted users past retention', async () => {
    mockFindMany
      .mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }])
      .mockResolvedValueOnce([]);
    mockDeleteMany.mockResolvedValueOnce({ count: 2 });

    const count = await cleanupDeletedAccounts();

    expect(count).toBe(2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: { not: null, lt: expect.any(Date) } },
        select: { id: true },
        take: 1000,
      }),
    );
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
    });
  });

  it('returns zero when no deleted accounts are expired', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const count = await cleanupDeletedAccounts();
    expect(count).toBe(0);
  });
});

describe('runDataCleanup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('runs all retention tables and deleted accounts', async () => {
    mockFindMany.mockResolvedValue([]);
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const report = await runDataCleanup();

    expect(report.results.length).toBeGreaterThanOrEqual(RETENTION_TABLES.length);
    expect(report.totalDeleted).toBe(0);
    expect(report.startedAt).toBeDefined();
    expect(report.completedAt).toBeDefined();
  });

  it('continues when one table fails', async () => {
    let callIndex = 0;
    mockFindMany.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) throw new Error('DB timeout');
      return Promise.resolve([]);
    });
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const report = await runDataCleanup();

    const failed = report.results.find((r) => r.error?.includes('DB timeout'));
    expect(failed).toBeDefined();
    expect(report.results.length).toBeGreaterThanOrEqual(RETENTION_TABLES.length);
  });
});

describe('getCutoffDate', () => {
  it('returns a date N days in the past', () => {
    const cutoff = getCutoffDate(30);
    const now = new Date();
    const diffDays = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
    expect(cutoff.getHours()).toBe(0);
    expect(cutoff.getMinutes()).toBe(0);
    expect(cutoff.getSeconds()).toBe(0);
  });
});
