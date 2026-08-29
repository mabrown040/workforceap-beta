import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lock: vi.fn(),
  attach: vi.fn(),
  promote: vi.fn(),
  upsertMapping: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: mocks.transaction },
}));
vi.mock('@/lib/coursera/csvImport.server', () => ({
  lockCourseraIdentityForAttachment: mocks.lock,
  attachRawCourseraProgressToUser: mocks.attach,
  promoteCsvProgressToCanonical: mocks.promote,
}));
vi.mock('@/lib/xapi/mappings', () => ({
  upsertCourseraIdentityMapping: mocks.upsertMapping,
}));

import { mapCourseraIdentityAndProgress } from '@/lib/coursera/mapIdentityAndProgress.server';

describe('mapCourseraIdentityAndProgress', () => {
  const tx = { id: 'tx-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    mocks.lock.mockResolvedValue(undefined);
    mocks.attach.mockResolvedValue({ courseRowsUpdated: 2, badgeRowsUpdated: 1 });
    mocks.upsertMapping.mockResolvedValue({ id: 'mapping-1', userId: 'user-1' });
    mocks.promote.mockResolvedValue({
      upserted: 2,
      unmapped: 0,
      rollupsRefreshed: 1,
      errors: 0,
    });
  });

  it('locks, attaches raw rows, and writes the mapping in one transaction', async () => {
    const result = await mapCourseraIdentityAndProgress({
      userId: 'user-1',
      organizationId: 'org-1',
      courseraEmail: ' Learner@Example.com ',
      createdByUserId: 'admin-1',
      source: 'manual-test',
    });

    expect(mocks.lock).toHaveBeenCalledWith(tx, {
      organizationId: 'org-1',
      courseraEmail: 'learner@example.com',
      actorIdentifier: null,
      actorHomePage: null,
    });
    expect(mocks.attach).toHaveBeenCalledWith(
      {
        courseraEmail: 'learner@example.com',
        userId: 'user-1',
        expectedOrganizationId: 'org-1',
      },
      tx,
    );
    expect(mocks.upsertMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        expectedOrganizationId: 'org-1',
      }),
      tx,
    );
    expect(mocks.attach.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.upsertMapping.mock.invocationCallOrder[0],
    );
    expect(mocks.upsertMapping.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.promote.mock.invocationCallOrder[0],
    );
    expect(result.backfill).toMatchObject({
      courseRowsUpdated: 2,
      badgeRowsUpdated: 1,
      promotion: { upserted: 2, rollupsRefreshed: 1 },
    });
  });

  it('does not commit a mapping or promote when raw ownership conflicts', async () => {
    mocks.attach.mockRejectedValue(
      new Error('Coursera email already has progress linked to a different WAP user'),
    );

    await expect(
      mapCourseraIdentityAndProgress({
        userId: 'user-2',
        organizationId: 'org-1',
        courseraEmail: 'learner@example.com',
        source: 'manual-test',
      }),
    ).rejects.toThrow('different WAP user');
    expect(mocks.upsertMapping).not.toHaveBeenCalled();
    expect(mocks.promote).not.toHaveBeenCalled();
  });
});
