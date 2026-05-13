import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPrograms, invalidateProgramCache, PROGRAMS } from './programs';

const mockCache = {
  getCacheOrFetch: vi.fn(),
  invalidateCache: vi.fn(),
};

vi.mock('@/lib/cache', () => ({
  getCacheOrFetch: (...args: unknown[]) => mockCache.getCacheOrFetch(...args),
  invalidateCache: (...args: unknown[]) => mockCache.invalidateCache(...args),
}));

describe('programs caching', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAllPrograms uses cache on hit', async () => {
    mockCache.getCacheOrFetch.mockResolvedValueOnce([
      { slug: 'cached-program', title: 'Cached' },
    ]);
    const result = await getAllPrograms();
    expect(mockCache.getCacheOrFetch).toHaveBeenCalledWith(
      'programs:all',
      expect.any(Function),
      3600,
    );
    expect(result).toEqual([{ slug: 'cached-program', title: 'Cached' }]);
  });

  it('getAllPrograms falls back to static PROGRAMS on miss', async () => {
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    const result = await getAllPrograms();
    expect(result).toBe(PROGRAMS);
    expect(mockCache.getCacheOrFetch).toHaveBeenCalledWith(
      'programs:all',
      expect.any(Function),
      3600,
    );
  });

  it('invalidateProgramCache calls invalidateCache with programs:*', async () => {
    mockCache.invalidateCache.mockResolvedValue(undefined);
    await invalidateProgramCache();
    expect(mockCache.invalidateCache).toHaveBeenCalledWith('programs:*');
  });
});
