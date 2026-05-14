import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPrograms, invalidateProgramCache, PROGRAMS } from './programs';

const VALID_LANGUAGE_LEVELS = ['full', 'subtitles', 'ai-subtitles', 'none'] as const;

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

describe('program language metadata', () => {
  it('every program has languagesSupported', () => {
    for (const program of PROGRAMS) {
      expect(program.languagesSupported).toBeDefined();
      expect(program.languagesSupported).toHaveProperty('es');
      expect(program.languagesSupported).toHaveProperty('pt');
      expect(program.languagesSupported).toHaveProperty('fr');
    }
  });

  it('all language levels are valid', () => {
    for (const program of PROGRAMS) {
      const ls = program.languagesSupported;
      expect(ls).toBeDefined();
      for (const level of Object.values(ls!)) {
        expect(VALID_LANGUAGE_LEVELS).toContain(level);
      }
    }
  });

  it('at least one program has non-English language support', () => {
    const withSupport = PROGRAMS.filter((p) => {
      const ls = p.languagesSupported;
      if (!ls) return false;
      return ls.es !== 'none' || ls.pt !== 'none' || ls.fr !== 'none';
    });
    expect(withSupport.length).toBeGreaterThan(0);
  });
});
