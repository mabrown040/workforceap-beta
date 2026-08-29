import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  executeRawUnsafe: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $executeRawUnsafe: mocks.executeRawUnsafe },
}));
vi.mock('@/lib/email', () => ({
  sendCourseraUnmatchedActorAlertEmail: vi.fn(),
}));

import { upsertCourseraIdentityMapping } from '@/lib/xapi/mappings';

describe('Stage A Coursera mapping ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.executeRawUnsafe.mockResolvedValue(undefined);
  });

  it('fails closed when an existing identity is not still owned by the requested user', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'mapping-1' }])
      .mockResolvedValueOnce([]);
    const executeRaw = vi.fn().mockResolvedValue(1);
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'new-user',
          email: 'new@example.com',
          fullName: 'New User',
          organizationId: 'org-1',
        }),
      },
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as never;

    await expect(
      upsertCourseraIdentityMapping(
        {
          userId: 'new-user',
          courseraEmail: 'learner@example.com',
          source: 'test',
          expectedOrganizationId: 'org-1',
        },
        db,
      ),
    ).rejects.toThrow('already mapped to a different WAP user');

    expect(executeRaw).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(1);
    const ownershipLookup = queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    expect(ownershipLookup.join('')).toContain('LIMIT 1');
    const tenantFilter = queryRaw.mock.calls[0]?.[2] as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    expect(tenantFilter.strings.join('')).toContain('organization_id =');
    expect(tenantFilter.values).toContain('org-1');
  });
});
