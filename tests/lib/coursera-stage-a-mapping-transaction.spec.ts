import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockIdentity: vi.fn(),
  attachRaw: vi.fn(),
  promote: vi.fn(),
  ensureTables: vi.fn(),
  upsertMapping: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock('@/lib/coursera/csvImport.server', () => ({
  lockCourseraIdentityForAttachment: mocks.lockIdentity,
  attachRawCourseraProgressToUser: mocks.attachRaw,
  promoteCsvProgressToCanonical: mocks.promote,
}));
vi.mock('@/lib/xapi/mappings', () => ({
  ensureCourseraMappingTables: mocks.ensureTables,
  upsertCourseraIdentityMapping: mocks.upsertMapping,
}));

import { mapCourseraIdentityAndProgress } from '@/lib/coursera/mapIdentityAndProgress.server';

describe('Stage A identity mapping transaction', () => {
  const tx = { $queryRaw: mocks.queryRaw };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTables.mockResolvedValue(undefined);
    mocks.lockIdentity.mockResolvedValue(undefined);
    mocks.attachRaw.mockResolvedValue({ courseRowsUpdated: 2, badgeRowsUpdated: 1 });
    mocks.upsertMapping.mockResolvedValue({
      id: 'mapping-1',
      courseraEmail: 'learner@example.com',
    });
    mocks.promote.mockResolvedValue({ upserted: 2, errors: 0 });
    mocks.queryRaw
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
  });

  it('uses the same transaction client for lock, raw adoption, and mapping', async () => {
    const result = await mapCourseraIdentityAndProgress({
      userId: 'user-1',
      organizationId: 'org-1',
      courseraEmail: ' Learner@Example.com ',
      createdByUserId: 'admin-1',
      source: 'test',
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.lockIdentity).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        organizationId: 'org-1',
        courseraEmail: 'learner@example.com',
      }),
    );
    expect(mocks.attachRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        expectedOrganizationId: 'org-1',
      }),
      tx,
    );
    expect(mocks.upsertMapping).toHaveBeenCalledWith(
      expect.objectContaining({ expectedOrganizationId: 'org-1' }),
      tx,
    );
    expect(mocks.promote).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.backfill).toEqual({ courseRowsUpdated: 2, badgeRowsUpdated: 1 });
  });

  it('does not write the mapping or project progress after an adoption conflict', async () => {
    mocks.attachRaw.mockRejectedValue(
      new Error('Coursera raw progress belongs to a different user or organization'),
    );

    await expect(
      mapCourseraIdentityAndProgress({
        userId: 'user-1',
        organizationId: 'org-1',
        courseraEmail: 'learner@example.com',
        source: 'test',
      }),
    ).rejects.toThrow('different user or organization');

    expect(mocks.upsertMapping).not.toHaveBeenCalled();
    expect(mocks.promote).not.toHaveBeenCalled();
  });

  it('rejects an identity already linked to a different user before raw adoption', async () => {
    mocks.queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([{ id: 'mapping-2' }]);

    await expect(
      mapCourseraIdentityAndProgress({
        userId: 'user-1',
        organizationId: 'org-1',
        courseraEmail: 'learner@example.com',
        source: 'test',
      }),
    ).rejects.toThrow('already linked to a different WAP user or organization');

    expect(mocks.attachRaw).not.toHaveBeenCalled();
    expect(mocks.upsertMapping).not.toHaveBeenCalled();
  });
});
