import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: vi.fn((init: any) => [init, vi.fn()]),
  };
});

describe('DownloadMyDataButton', () => {
  it('exports a default component', async () => {
    const mod = await import('@/components/portal/DownloadMyDataButton');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('component name is preserved', async () => {
    const { default: DownloadMyDataButton } = await import('@/components/portal/DownloadMyDataButton');
    expect(DownloadMyDataButton.name).toBe('DownloadMyDataButton');
  });
});
