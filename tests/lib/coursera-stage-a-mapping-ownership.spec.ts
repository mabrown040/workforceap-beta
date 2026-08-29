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
      .mockResolvedValueOnce([{ id: 'new-user' }])
      .mockResolvedValueOnce([{ id: 'mapping-1', userId: 'old-user' }]);
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
    expect(queryRaw).toHaveBeenCalledTimes(2);
    const directOwnerLookup = queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    expect(directOwnerLookup.join('')).toContain('FROM users AS direct_user');
    expect(directOwnerLookup.join('')).toContain('FOR SHARE');

    const ownershipLookup = queryRaw.mock.calls[1]?.[0] as TemplateStringsArray;
    expect(ownershipLookup.join('')).toContain('LIMIT 1');
    const tenantFilter = queryRaw.mock.calls[1]?.[2] as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    expect(tenantFilter.strings.join('')).toContain('organization_id =');
    expect(tenantFilter.values).toContain('org-1');
  });

  it('rejects mapping an active portal login email to another user', async () => {
    const queryRaw = vi.fn().mockResolvedValueOnce([{ id: 'portal-owner' }]);
    const executeRaw = vi.fn();
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'mapping-target',
          email: 'target@example.com',
          fullName: 'Target User',
          organizationId: 'org-1',
          deletedAt: null,
        }),
      },
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as never;

    await expect(
      upsertCourseraIdentityMapping(
        {
          userId: 'mapping-target',
          courseraEmail: 'owner@example.com',
          source: 'test',
          expectedOrganizationId: 'org-1',
        },
        db,
      ),
    ).rejects.toThrow('belongs to a different active WAP user');

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
