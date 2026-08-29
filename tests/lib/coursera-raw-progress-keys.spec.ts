import { describe, expect, it, vi } from 'vitest';

const queryRaw = vi.hoisted(() =>
  vi.fn(async (..._args: unknown[]) => [{ installed: true }]),
);

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $queryRaw: queryRaw },
}));

import {
  ensureBadgeProgressTenantKeys,
  ensureCourseProgressTenantKeys,
} from '@/lib/coursera/rawProgressTenantKeys';

describe('raw Coursera tenant keys', () => {
  it('verifies organization-local course and badge conflict indexes without runtime DDL', async () => {
    await ensureCourseProgressTenantKeys();
    await ensureBadgeProgressTenantKeys();

    expect(queryRaw).toHaveBeenCalledTimes(2);
    for (const call of queryRaw.mock.calls) {
      const statement = call[0] as
        | string[]
        | { sql?: string; strings?: string[] }
        | undefined;
      const sql = Array.isArray(statement)
        ? statement.join('')
        : typeof statement?.sql === 'string'
          ? statement.sql
          : statement?.strings?.join('') ?? '';
      expect(sql).toContain('index_row.indisvalid');
      expect(sql).toContain('index_row.indisready');
      expect(sql).toContain('index_row.indisunique');
      expect(sql).toContain('pg_get_indexdef');
      expect(sql).toContain('_exact_key');
      expect(sql.match(/\bEXISTS\s*\(/g)).toHaveLength(2);
    }
  });
});
