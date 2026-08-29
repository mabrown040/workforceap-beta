import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    organizationProgramCatalog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db/optionalBuildDb', () => ({
  shouldSkipOptionalDbQueriesAtBuild: vi.fn(() => false),
}));

vi.mock('@/lib/tenant/organization', () => ({
  getDefaultOrganizationId: vi.fn(async () => 'default-org'),
}));

import { prisma } from '@/lib/db/prisma';
import { getActivePrograms, getActiveProgramsResult } from '@/lib/platform/programCatalog';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

describe('getActivePrograms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the static fallback only when the tenant catalog is truly empty', async () => {
    vi.mocked(prisma.organizationProgramCatalog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.organizationProgramCatalog.count).mockResolvedValue(0);

    const programs = await getActivePrograms('org-1');

    expect(programs.length).toBeGreaterThan(0);
    expect(programs.every((program) => program.status === 'active')).toBe(true);
  });

  it('returns no choices when an explicit tenant catalog has no active rows', async () => {
    vi.mocked(prisma.organizationProgramCatalog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.organizationProgramCatalog.count).mockResolvedValue(2);

    await expect(getActivePrograms('org-1')).resolves.toEqual([]);
  });

  it('carries fallback status and bypasses the default-org cache in read-only audit mode', async () => {
    vi.mocked(prisma.organizationProgramCatalog.findMany).mockRejectedValue(
      new Error('catalog unavailable'),
    );

    const result = await getActiveProgramsResult(undefined, { readOnlyAudit: true });

    expect(result.loadFailed).toBe(true);
    expect(result.programs.length).toBeGreaterThan(0);
    expect(getDefaultOrganizationId).toHaveBeenCalledWith({ readOnlyAudit: true });
  });
});
