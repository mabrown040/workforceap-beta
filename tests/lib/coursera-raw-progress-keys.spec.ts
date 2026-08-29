import { describe, expect, it, vi } from 'vitest';

const queryRaw = vi.hoisted(() => vi.fn(async () => [{ installed: true }]));

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
  });
});
