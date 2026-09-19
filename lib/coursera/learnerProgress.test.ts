import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  _resetTokenCacheForTesting,
  _setFetchForTesting,
} from './b4bClient';
import {
  averageProgramProgressFromB4B,
  fetchLearnerProgressFromB4B,
  getLearnerProgressLastActivity,
  invalidateLearnerProgressCacheForEmail,
} from './learnerProgress';

const mockCache = {
  getCacheOrFetch: vi.fn(),
  invalidateCache: vi.fn(),
};

vi.mock('@/lib/cache', () => ({
  getCacheOrFetch: (...args: unknown[]) => mockCache.getCacheOrFetch(...args),
  invalidateCache: (...args: unknown[]) => mockCache.invalidateCache(...args),
}));

const ORIGINAL_ENV: Record<string, string | undefined> = {};
function snapshotEnv() {
  for (const k of [
    'COURSERA_B4B_CLIENT_ID',
    'COURSERA_B4B_CLIENT_SECRET',
    'COURSERA_API_BASE_URL',
    'COURSERA_OAUTH_TOKEN_URL',
    'COURSERA_ORG_ID',
  ]) {
    ORIGINAL_ENV[k] = process.env[k];
  }
}
function restoreEnv() {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function setupTestEnv() {
  snapshotEnv();
  process.env.COURSERA_B4B_CLIENT_ID = 'test-client-id';
  process.env.COURSERA_B4B_CLIENT_SECRET = 'test-client-secret';
  process.env.COURSERA_API_BASE_URL = 'https://api.coursera.com/ent';
  process.env.COURSERA_OAUTH_TOKEN_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
  process.env.COURSERA_ORG_ID = 'TEST_ORG_ID';
  _resetTokenCacheForTesting();
}

function teardownTestEnv() {
  _setFetchForTesting(null);
  _resetTokenCacheForTesting();
  restoreEnv();
}

function jsonResponse(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('learnerProgress', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupTestEnv();
  });

  afterEach(() => {
    teardownTestEnv();
  });

  it('returns the local-fallback signal without cache or network work in a read-only audit', async () => {
    const result = await fetchLearnerProgressFromB4B('member@example.com', {
      programId: 'PRG-1',
      readOnlyAudit: true,
    });

    expect(result.size).toBe(0);
    expect(mockCache.getCacheOrFetch).not.toHaveBeenCalled();
  });

  it('returns a map keyed by contentId with normalized fields', async () => {
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) {
        return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      }
      return jsonResponse({
        elements: [
          {
            programId: 'PRG-1',
            externalId: 'mabrown040@gmail.com',
            contentId: 'COURSE-A',
            contentType: 'Course',
            isCompleted: false,
            overallProgress: 42.4,
            lastActivity: 1_700_000_000_000,
          },
          {
            programId: 'PRG-1',
            externalId: 'mabrown040@gmail.com',
            contentId: 'SPEC-B',
            contentType: 'Specialization',
            isCompleted: true,
            overallProgress: 100,
            lastActivity: 1_700_000_500_000,
          },
        ],
        paging: { total: 2 },
      });
    });

    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());

    const result = await fetchLearnerProgressFromB4B('mabrown040@gmail.com', {
      programId: 'PRG-1',
    });

    expect(result.size).toBe(2);
    const a = result.get('COURSE-A');
    expect(a).toBeDefined();
    expect(a!.overallProgress).toBe(42);
    expect(a!.contentType).toBe('Course');
    expect(a!.isCompleted).toBe(false);
    expect(a!.lastActivityAt instanceof Date).toBe(true);

    const b = result.get('SPEC-B');
    expect(b).toBeDefined();
    expect(b!.contentType).toBe('Specialization');
    expect(b!.isCompleted).toBe(true);
    expect(b!.overallProgress).toBe(100);

    expect(mockCache.getCacheOrFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockCache.getCacheOrFetch.mock.calls[0];
    expect(callArgs[0]).toContain('coursera:learner:');
    expect(callArgs[2]).toBe(1800);
  });

  it('reuses Redis cache on hit, refetches when skipCache=true', async () => {
    let enrollmentCalls = 0;
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) {
        return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      }
      if (url.includes('/enrollmentReports')) {
        enrollmentCalls += 1;
        return jsonResponse({
          elements: [
            {
              programId: 'PRG-1',
              externalId: 'a@b.com',
              contentId: 'C1',
              contentType: 'Course',
              isCompleted: false,
              overallProgress: 10,
            },
          ],
          paging: { total: 1 },
        });
      }
      return jsonResponse({});
    });

    // First call: Redis miss
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1' });
    expect(enrollmentCalls).toBe(1);

    // Second call: Redis hit
    mockCache.getCacheOrFetch.mockResolvedValue([
      ['C1', {
        contentId: 'C1',
        contentType: 'Course',
        programId: 'PRG-1',
        isCompleted: false,
        overallProgress: 10,
        lastActivityAt: null,
      }],
    ]);
    const result2 = await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1' });
    expect(enrollmentCalls).toBe(1);
    expect(result2.size).toBe(1);

    // Third call with skipCache
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1', skipCache: true });
    expect(enrollmentCalls).toBe(2);
  });

  it('returns empty map and caches it when B4B throws', async () => {
    let enrollmentCalls = 0;
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) {
        return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      }
      enrollmentCalls += 1;
      return new Response('upstream blew up', { status: 503 });
    });

    // First call: Redis miss → B4B fetch retries 3 times
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    const result = await fetchLearnerProgressFromB4B('e@f.com', { programId: 'PRG-1' });
    expect(result.size).toBe(0);
    expect(enrollmentCalls).toBe(3);

    // Second call within TTL should use cached empty result
    mockCache.getCacheOrFetch.mockResolvedValue([]);
    const result2 = await fetchLearnerProgressFromB4B('e@f.com', { programId: 'PRG-1' });
    expect(result2.size).toBe(0);
    expect(enrollmentCalls).toBe(3);
  });

  it('queries listPrograms when programId is omitted, then caches the program list', async () => {
    let listCalls = 0;
    let enrollmentCalls = 0;
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) {
        return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      }
      if (url.includes('/programs')) {
        listCalls += 1;
        return jsonResponse({
          elements: [
            { id: 'PRG-A', name: 'Program A' },
            { id: 'PRG-B', name: 'Program B' },
          ],
          paging: { total: 2 },
        });
      }
      if (url.includes('/enrollmentReports')) {
        enrollmentCalls += 1;
        const u = new URL(url);
        const programId = u.searchParams.get('programId') ?? 'unknown';
        return jsonResponse({
          elements: [
            {
              programId,
              externalId: 'g@h.com',
              contentId: `course-of-${programId}`,
              contentType: 'Course',
              isCompleted: false,
              overallProgress: 25,
            },
          ],
          paging: { total: 1 },
        });
      }
      return jsonResponse({});
    });

    // First call: let all getCacheOrFetch calls run through
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());

    const result = await fetchLearnerProgressFromB4B('g@h.com');
    expect(result.size).toBe(2);
    expect(listCalls).toBe(1);
    expect(enrollmentCalls).toBe(2);

    // Second learner: program list should be cached in Redis
    mockCache.getCacheOrFetch.mockImplementation(async (key, fetcher) => {
      if (key === 'coursera:program-ids:v2:TEST_ORG_ID') {
        return { ids: ['PRG-A', 'PRG-B'], capped: false };
      }
      return fetcher();
    });

    await fetchLearnerProgressFromB4B('i@j.com');
    expect(listCalls).toBe(1);
  });

  it('averageProgramProgressFromB4B requires every courseId to be present', () => {
    const map = new Map();
    map.set('C1', {
      contentId: 'C1',
      contentType: 'Course' as const,
      programId: 'PRG-1',
      isCompleted: false,
      overallProgress: 50,
      lastActivityAt: null,
    });
    map.set('C2', {
      contentId: 'C2',
      contentType: 'Course' as const,
      programId: 'PRG-1',
      isCompleted: true,
      overallProgress: 100,
      lastActivityAt: null,
    });

    expect(averageProgramProgressFromB4B({ progress: map, courseraCourseIds: ['C1', 'C2'] })).toBe(75);
    expect(averageProgramProgressFromB4B({ progress: map, courseraCourseIds: ['C1', 'C2', 'C3'] })).toBeNull();
    expect(averageProgramProgressFromB4B({ progress: map, courseraCourseIds: [] })).toBeNull();
  });

  it('drains program and learner pages using provider cursors and documented activity dates', async () => {
    const starts: Array<[string, string | null]> = [];
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      const parsedUrl = new URL(url);
      const start = parsedUrl.searchParams.get('start');
      starts.push([parsedUrl.pathname, start]);
      if (url.includes('/programs')) return jsonResponse({
        elements: [{ id: start === '0' ? 'P1' : 'P2' }],
        paging: start === '0' ? { next: 100 } : {},
      });
      const programId = parsedUrl.searchParams.get('programId');
      return jsonResponse({
        elements: [{ programId, contentId: `${programId}-${start}`, isCompleted: start !== '0',
          overallProgress: start === '0' ? 37 : 78,
          lastActivityAt: 1_700_000_500_000, lastActivity: 1_700_000_000_000 }],
        paging: start === '0' ? { next: '200' } : {},
      });
    });
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    const result = await fetchLearnerProgressFromB4B('learner@example.com');
    expect(result.coverage).toBe('complete');
    expect(result.size).toBe(4);
    expect(starts.map(([, start]) => start)).toEqual(['0', '100', '0', '200', '0', '200']);
    expect(result.get('P1-0')?.lastActivityAt?.getTime()).toBe(1_700_000_500_000);
    expect(result.get('P1-200')).toMatchObject({ isCompleted: true, overallProgress: 78 });
  });

  it('continues a full page without paging metadata instead of truncating at 200 rows', async () => {
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      const start = Number(new URL(url).searchParams.get('start'));
      return jsonResponse({ elements: Array.from({ length: start === 0 ? 200 : 1 }, (_, index) => ({
        programId: 'P1', contentId: `C${start + index}`, isCompleted: false, overallProgress: 37,
      })), paging: {} });
    });
    const result = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1', skipCache: true });
    expect(result.size).toBe(201);
    expect(result.coverage).toBe('complete');
  });

  it('keeps capped coverage through the cache and refuses an authoritative average', async () => {
    let pages = 0;
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      pages++;
      return jsonResponse({ elements: [{ programId: 'P1', contentId: `C${pages}`, isCompleted: false, overallProgress: 37 }],
        paging: { next: pages * 200 } });
    });
    let cached: unknown;
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => cached ?? (cached = await fetcher()));
    const result = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1' });
    expect(result.coverage).toBe('capped');
    expect(pages).toBe(10);
    expect(averageProgramProgressFromB4B({ progress: result, courseraCourseIds: ['C1'] })).toBeNull();
    const cachedResult = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1' });
    expect(cachedResult.coverage).toBe('capped');
    expect(pages).toBe(10);
  });

  it('marks a failed later page unavailable while retaining earlier facts', async () => {
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      if (new URL(url).searchParams.get('start') !== '0') return new Response('denied', { status: 403 });
      return jsonResponse({ elements: [{ programId: 'P1', contentId: 'C1', isCompleted: false, overallProgress: 37 }],
        paging: { next: 200 } });
    });
    const result = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1', skipCache: true });
    expect(result.coverage).toBe('unavailable');
    expect(result.get('C1')?.overallProgress).toBe(37);
    expect(averageProgramProgressFromB4B({ progress: result, courseraCourseIds: ['C1'] })).toBeNull();
  });

  it('marks an opaque or repeated cursor incomplete rather than declaring the first page complete', async () => {
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      return jsonResponse({ elements: [{ programId: 'P1', contentId: 'C1', overallProgress: 37, isCompleted: false }],
        paging: { next: new URL(url).searchParams.get('start') === '0' ? '200' : 'opaque:next' } });
    });
    const result = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1', skipCache: true });
    expect(result.coverage).toBe('unavailable');
    expect(result.size).toBe(1);
    expect(averageProgramProgressFromB4B({ progress: result, courseraCourseIds: ['C1'] })).toBeNull();
  });

  it('merges newer activity even when the duplicate progress percentage does not increase', async () => {
    _setFetchForTesting(async (url) => {
      if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
      return jsonResponse({ elements: [
        { programId: 'P1', contentId: 'C1', overallProgress: 78, isCompleted: true, lastActivityAt: 1_700_000_000_000 },
        { programId: 'P1', contentId: 'C1', overallProgress: 78, isCompleted: false, lastActivityAt: 1_700_000_500_000 },
      ], paging: { total: 2 } });
    });
    const result = await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1', skipCache: true });
    expect(result.get('C1')).toMatchObject({ isCompleted: true, overallProgress: 78 });
    expect(result.get('C1')?.lastActivityAt?.getTime()).toBe(1_700_000_500_000);
    expect(mockCache.invalidateCache).toHaveBeenCalledWith('coursera:learner:learner@example.com::P1:v2:TEST_ORG_ID');
  });

  it('separates cached learner snapshots by configured provider organization', async () => {
    _setFetchForTesting(async (url) => url.includes('/oauth2/')
      ? jsonResponse({ access_token: 'tok', expires_in: 1799 }) : jsonResponse({ elements: [], paging: {} }));
    mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
    await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1' });
    process.env.COURSERA_ORG_ID = 'SECOND_ORG';
    await fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1' });
    const keys = mockCache.getCacheOrFetch.mock.calls.map(([key]) => key);
    expect(keys).toContain('coursera:learner:learner@example.com::P1:v2:TEST_ORG_ID');
    expect(keys).toContain('coursera:learner:learner@example.com::P1:v2:SECOND_ORG');
  });

  it('stops a slow multipage request at its whole-read deadline and retains observed facts', async () => {
    vi.useFakeTimers();
    try {
      let reportCalls = 0;
      _setFetchForTesting(async (url) => {
        if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
        const page = ++reportCalls;
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        return jsonResponse({ elements: [{ programId: 'P1', contentId: `C${page}`, overallProgress: 37, isCompleted: false }],
          paging: { next: String(page * 200) } });
      });
      const pending = fetchLearnerProgressFromB4B('learner@example.com', { programId: 'P1', skipCache: true });
      await vi.advanceTimersByTimeAsync(8_000);
      const result = await pending;
      expect(result.coverage).toBe('capped');
      expect([...result.keys()]).toEqual(['C1', 'C2']);
      expect(reportCalls).toBe(3);
      await vi.advanceTimersByTimeAsync(4_000);
      expect(reportCalls).toBe(3); // no subsequent page after the deadline
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it.each(['deadline', 'page-cap'])('preserves an earlier program failure when a later program reaches its %s', async (limit) => {
    vi.useFakeTimers();
    try {
      let successfulProgramCalls = 0;
      _setFetchForTesting(async (url) => {
        if (url.includes('/oauth2/')) return jsonResponse({ access_token: 'tok', expires_in: 1799 });
        if (url.includes('/programs')) return jsonResponse({ elements: [{ id: 'P1' }, { id: 'P2' }], paging: {} });
        if (new URL(url).searchParams.get('programId') === 'P1') return new Response('denied', { status: 403 });
        const page = ++successfulProgramCalls;
        if (limit === 'deadline') await new Promise((resolve) => setTimeout(resolve, 3_000));
        return jsonResponse({ elements: [{ programId: 'P2', contentId: `C${page}`, overallProgress: 37, isCompleted: false }],
          paging: { next: String(page * 200) } });
      });
      mockCache.getCacheOrFetch.mockImplementation(async (_key, fetcher) => fetcher());
      const pending = fetchLearnerProgressFromB4B('learner@example.com', { skipCache: true });
      await vi.advanceTimersByTimeAsync(8_000);
      const result = await pending;
      expect(result.coverage).toBe('unavailable');
      expect(result.size).toBe(limit === 'deadline' ? 2 : 9);
      expect(result.get('C1')?.overallProgress).toBe(37);
      expect(averageProgramProgressFromB4B({ progress: result, courseraCourseIds: ['C1'] })).toBeNull();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('getLearnerProgressLastActivity returns the latest timestamp', () => {
    const map = new Map();
    map.set('C1', {
      contentId: 'C1',
      contentType: 'Course' as const,
      programId: 'PRG-1',
      isCompleted: false,
      overallProgress: 10,
      lastActivityAt: new Date('2026-05-01T00:00:00Z'),
    });
    map.set('C2', {
      contentId: 'C2',
      contentType: 'Course' as const,
      programId: 'PRG-1',
      isCompleted: false,
      overallProgress: 20,
      lastActivityAt: new Date('2026-05-08T12:00:00Z'),
    });
    map.set('C3', {
      contentId: 'C3',
      contentType: 'Course' as const,
      programId: 'PRG-1',
      isCompleted: false,
      overallProgress: 0,
      lastActivityAt: null,
    });

    const latest = getLearnerProgressLastActivity(map);
    expect(latest?.toISOString()).toBe('2026-05-08T12:00:00.000Z');
  });

  it('empty email returns empty map without making API calls', async () => {
    let calls = 0;
    _setFetchForTesting(async () => {
      calls += 1;
      return jsonResponse({});
    });

    const result = await fetchLearnerProgressFromB4B('');
    expect(result.size).toBe(0);
    expect(calls).toBe(0);
  });

  it('invalidateLearnerProgressCacheForEmail calls invalidateCache', async () => {
    mockCache.invalidateCache.mockResolvedValue(undefined);
    await invalidateLearnerProgressCacheForEmail('test@example.com');
    expect(mockCache.invalidateCache).toHaveBeenCalledWith('coursera:learner:test@example.com::*');
  });
});
