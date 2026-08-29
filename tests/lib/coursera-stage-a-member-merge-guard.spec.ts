import { describe, expect, it, vi } from 'vitest';

import { assertNoCourseraOwnershipForMemberMerge } from '@/lib/admin/memberMerge';

function sqlText(query: unknown): string {
  const sql = (query as { sql?: string | string[] }).sql;
  return Array.isArray(sql) ? sql.join('') : String(sql ?? '');
}

describe('Stage A member merge Coursera ownership guard', () => {
  it('takes deterministic user locks and blocks a secondary member with Coursera ownership', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'primary', organizationId: 'org-1', deletedAt: null },
        { id: 'secondary', organizationId: 'org-1', deletedAt: null },
      ])
      .mockResolvedValueOnce([{ source: 'course' }]);
    const tx = { $queryRaw: queryRaw } as never;

    await expect(
      assertNoCourseraOwnershipForMemberMerge(
        tx,
        'primary',
        'secondary',
        'org-1',
      ),
    ).rejects.toThrow(
      'Member merge blocked: secondary member has Coursera progress or identity mappings',
    );

    expect(queryRaw).toHaveBeenCalledTimes(2);
    const lockSql = sqlText(queryRaw.mock.calls[0]?.[0]);
    expect(lockSql).toContain('ORDER BY merge_user.id');
    expect(lockSql).toContain('FOR UPDATE');
  });

  it('fails closed before the ownership query when either user is stale or outside the organization', async () => {
    const queryRaw = vi.fn().mockResolvedValueOnce([
      { id: 'primary', organizationId: 'org-1', deletedAt: null },
      { id: 'secondary', organizationId: 'org-2', deletedAt: null },
    ]);
    const tx = { $queryRaw: queryRaw } as never;

    await expect(
      assertNoCourseraOwnershipForMemberMerge(
        tx,
        'primary',
        'secondary',
        'org-1',
      ),
    ).rejects.toThrow('outside the expected organization');

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('allows the merge guard to continue only for two active same-org users with no Coursera ownership', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([
        { id: 'primary', organizationId: 'org-1', deletedAt: null },
        { id: 'secondary', organizationId: 'org-1', deletedAt: null },
      ])
      .mockResolvedValueOnce([]);
    const tx = { $queryRaw: queryRaw } as never;

    await expect(
      assertNoCourseraOwnershipForMemberMerge(
        tx,
        'primary',
        'secondary',
        'org-1',
      ),
    ).resolves.toBeUndefined();

    expect(queryRaw).toHaveBeenCalledTimes(2);
    const ownershipSql = sqlText(queryRaw.mock.calls[1]?.[0]);
    expect(ownershipSql).toContain('coursera_course_progress');
    expect(ownershipSql).toContain('coursera_badge_progress');
    expect(ownershipSql).toContain('coursera_identity_mappings');
  });
});
