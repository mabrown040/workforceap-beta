import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @upstash/redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  // Plain function (not vi.fn) so vi.resetAllMocks() cannot wipe it.
  Redis: function Redis() {
    return mockRedis;
  },
}));

// lib/cache.ts reads the UPSTASH env vars at module load, so the module
// must be (re-)imported after the env vars are set/unset in each test.
type CacheModule = typeof import('./cache');
let getCache: CacheModule['getCache'];
let setCache: CacheModule['setCache'];
let deleteCache: CacheModule['deleteCache'];
let getCacheOrFetch: CacheModule['getCacheOrFetch'];
let invalidateCache: CacheModule['invalidateCache'];

async function importCache() {
  vi.resetModules();
  ({ getCache, setCache, deleteCache, getCacheOrFetch, invalidateCache } = await import('./cache'));
}

describe('cache helpers', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Ensure UPSTASH env vars are set for tests
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    await importCache();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe('getCache', () => {
    it('returns null when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      await importCache();
      const result = await getCache('foo');
      expect(result).toBeNull();
    });

    it('returns parsed value on hit', async () => {
      mockRedis.get.mockResolvedValue({ hello: 'world' });
      const result = await getCache('foo');
      expect(mockRedis.get).toHaveBeenCalledWith('cache:foo');
      expect(result).toEqual({ hello: 'world' });
    });

    it('returns null on miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await getCache('foo');
      expect(result).toBeNull();
    });

    it('returns null on error and logs warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRedis.get.mockRejectedValue(new Error('redis down'));
      const result = await getCache('foo');
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('[cache] get failed:', expect.any(Error));
      warnSpy.mockRestore();
    });
  });

  describe('setCache', () => {
    it('no-ops when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      await importCache();
      await setCache('foo', 'bar', 60);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('stores value with TTL', async () => {
      await setCache('foo', 'bar', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('cache:foo', 'bar', { ex: 60 });
    });

    it('warns on error without throwing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRedis.set.mockRejectedValue(new Error('redis down'));
      await setCache('foo', 'bar', 60);
      expect(warnSpy).toHaveBeenCalledWith('[cache] set failed:', expect.any(Error));
      warnSpy.mockRestore();
    });
  });

  describe('deleteCache', () => {
    it('deletes a key', async () => {
      mockRedis.del.mockResolvedValue(1);
      await deleteCache('foo');
      expect(mockRedis.del).toHaveBeenCalledWith('cache:foo');
    });

    it('no-ops when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      await importCache();
      await deleteCache('foo');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getCacheOrFetch', () => {
    it('returns cached value on hit without calling fetcher', async () => {
      mockRedis.get.mockResolvedValue({ cached: true });
      const fetcher = vi.fn().mockResolvedValue({ fetched: true });
      const result = await getCacheOrFetch('foo', fetcher, 60);
      expect(result).toEqual({ cached: true });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('calls fetcher on miss and caches result', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetcher = vi.fn().mockResolvedValue({ fetched: true });
      const result = await getCacheOrFetch('foo', fetcher, 60);
      expect(result).toEqual({ fetched: true });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith('cache:foo', { fetched: true }, { ex: 60 });
    });
  });

  describe('invalidateCache', () => {
    it('scans and deletes matching keys', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['cache:programs:list:1', 'cache:programs:list:2']])
        .mockResolvedValueOnce(['0', []]);
      mockRedis.del.mockResolvedValue(2);

      await invalidateCache('programs:list:*');

      expect(mockRedis.scan).toHaveBeenCalledWith('0', {
        match: 'cache:programs:list:*',
        count: 100,
      });
      expect(mockRedis.del).toHaveBeenCalledWith(
        'cache:programs:list:1',
        'cache:programs:list:2'
      );
    });

    it('handles multi-page scans', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['cache:programs:list:1']])
        .mockResolvedValueOnce(['0', ['cache:programs:list:2']]);
      mockRedis.del.mockResolvedValue(1);

      await invalidateCache('programs:list:*');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith(
        'cache:programs:list:1',
        'cache:programs:list:2'
      );
    });

    it('no-ops when no keys match', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);
      await invalidateCache('nothing:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('no-ops when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      await importCache();
      await invalidateCache('foo:*');
      expect(mockRedis.scan).not.toHaveBeenCalled();
    });
  });
});
