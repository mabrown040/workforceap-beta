import { afterEach, describe, expect, it, vi } from 'vitest';

const memberResourcesModule = '@/lib/content/memberResources';
const memberResourcesIndex = '../../content/member-resources/index.json';

afterEach(() => {
  vi.doUnmock(memberResourcesIndex);
  vi.resetModules();
});

describe('member resource catalog loading', () => {
  it('preserves the array-only compatibility wrapper', async () => {
    const { getMemberResources, getMemberResourcesResult } = await import(memberResourcesModule);

    const result = await getMemberResourcesResult();
    const resources = await getMemberResources();

    expect(result.loadFailed).toBe(false);
    expect(result.resources.length).toBeGreaterThan(0);
    expect(resources).toEqual(result.resources);
  });

  it('bypasses both cache reads and cache writes during a read-only audit', async () => {
    const { getMemberResourcesResult } = await import(memberResourcesModule);

    const firstCached = await getMemberResourcesResult();
    const secondCached = await getMemberResourcesResult();
    const firstAudit = await getMemberResourcesResult({ readOnlyAudit: true });
    const secondAudit = await getMemberResourcesResult({ readOnlyAudit: true });

    expect(secondCached.resources).toBe(firstCached.resources);
    expect(firstAudit.resources).not.toBe(firstCached.resources);
    expect(secondAudit.resources).not.toBe(firstAudit.resources);
    expect(firstAudit.loadFailed).toBe(false);
    expect(secondAudit.loadFailed).toBe(false);
  });

  it('reports catalog import failures instead of returning an indistinguishable empty list', async () => {
    vi.doMock(memberResourcesIndex, () => {
      throw new Error('catalog unavailable');
    });

    const { getMemberResourcesResult } = await import(memberResourcesModule);

    await expect(getMemberResourcesResult({ readOnlyAudit: true })).resolves.toEqual({
      resources: [],
      loadFailed: true,
    });
  });
});
