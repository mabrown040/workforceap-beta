import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findMany: mocks.findMany },
    $queryRaw: mocks.queryRaw,
  },
}));

import { resolveUserIdsByCourseraEmails } from '@/lib/coursera/resolveUserIdByEmail';

describe('Coursera email mapping tenant ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.queryRaw.mockResolvedValue([
      { email: 'learner@example.com', userId: 'user-1' },
    ]);
  });

  it('requires the mapping and active user to share the requested organization', async () => {
    await expect(
      resolveUserIdsByCourseraEmails(['Learner@Example.com'], {
        organizationId: 'org-1',
      }),
    ).resolves.toEqual(new Map([['learner@example.com', 'user-1']]));

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          organizationId: 'org-1',
        }),
      }),
    );

    const mappingQuery = mocks.queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    const emailList = mocks.queryRaw.mock.calls[0]?.[1] as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    const organizationFilter = mocks.queryRaw.mock.calls[0]?.[2] as {
      strings: readonly string[];
      values: readonly unknown[];
    };

    expect(mappingQuery.join('')).toContain('u.deleted_at IS NULL');
    expect(mappingQuery.join('')).toContain('u.organization_id = cim.organization_id');
    expect(emailList.values).toEqual(['learner@example.com']);
    expect(organizationFilter.strings.join('')).toContain('cim.organization_id =');
    expect(organizationFilter.strings.join('')).toContain('u.organization_id =');
    expect(organizationFilter.values).toEqual(['org-1', 'org-1']);
  });

  it('fails closed when the direct portal owner and explicit mapping disagree', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'direct-user', email: 'learner@example.com' },
    ]);
    mocks.queryRaw.mockResolvedValue([
      { email: 'learner@example.com', userId: 'mapped-user' },
    ]);

    await expect(
      resolveUserIdsByCourseraEmails(['learner@example.com'], {
        organizationId: 'org-1',
      }),
    ).resolves.toEqual(new Map());

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });
});
