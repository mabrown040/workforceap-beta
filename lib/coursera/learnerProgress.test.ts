import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _resetTokenCacheForTesting,
  _setFetchForTesting,
} from './b4bClient';
import {
  _getLearnerCacheEntryForTesting,
  _resetLearnerProgressCachesForTesting,
  averageProgramProgressFromB4B,
  fetchLearnerProgressFromB4B,
  getLearnerProgressLastActivity,
} from './learnerProgress';

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
  _resetLearnerProgressCachesForTesting();
}

function teardownTestEnv() {
  _setFetchForTesting(null);
  _resetTokenCacheForTesting();
  _resetLearnerProgressCachesForTesting();
  restoreEnv();
}

function jsonResponse(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('returns a map keyed by contentId with normalized fields', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

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
          overallProgress: 42.4, // verifies clamp+round
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

  const result = await fetchLearnerProgressFromB4B('mabrown040@gmail.com', {
    programId: 'PRG-1',
  });

  assert.equal(result.size, 2);
  const a = result.get('COURSE-A');
  assert.ok(a);
  assert.equal(a!.overallProgress, 42);
  assert.equal(a!.contentType, 'Course');
  assert.equal(a!.isCompleted, false);
  assert.ok(a!.lastActivityAt instanceof Date);

  const b = result.get('SPEC-B');
  assert.ok(b);
  assert.equal(b!.contentType, 'Specialization');
  assert.equal(b!.isCompleted, true);
  assert.equal(b!.overallProgress, 100);
});

test('reuses cache within TTL, refetches when skipCache=true', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

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

  await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1' });
  await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1' });
  await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1' });
  assert.equal(enrollmentCalls, 1, 'second/third call served from cache');

  await fetchLearnerProgressFromB4B('a@b.com', { programId: 'PRG-1', skipCache: true });
  assert.equal(enrollmentCalls, 2, 'skipCache=true forces a refetch');
});

test('cache TTL elapses → next call refetches', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let enrollmentCalls = 0;
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/')) {
      return jsonResponse({ access_token: 'tok', expires_in: 1799 });
    }
    enrollmentCalls += 1;
    return jsonResponse({ elements: [], paging: { total: 0 } });
  });

  await fetchLearnerProgressFromB4B('c@d.com', { programId: 'PRG-1' });
  assert.equal(enrollmentCalls, 1);

  // Force the entry's fetchedAt to look 90s old.
  const entry = _getLearnerCacheEntryForTesting('c@d.com', 'PRG-1');
  assert.ok(entry);
  entry!.fetchedAt = Date.now() - 90_000;

  await fetchLearnerProgressFromB4B('c@d.com', { programId: 'PRG-1' });
  assert.equal(enrollmentCalls, 2, 'expired cache triggers refetch');
});

test('returns empty map and caches it when B4B throws', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let enrollmentCalls = 0;
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/')) {
      return jsonResponse({ access_token: 'tok', expires_in: 1799 });
    }
    enrollmentCalls += 1;
    return new Response('upstream blew up', { status: 503 });
  });

  const result = await fetchLearnerProgressFromB4B('e@f.com', { programId: 'PRG-1' });
  assert.equal(result.size, 0, 'soft-failure produces empty map');

  // Second call within TTL should not retry — the empty result is cached.
  const result2 = await fetchLearnerProgressFromB4B('e@f.com', { programId: 'PRG-1' });
  assert.equal(result2.size, 0);
  assert.equal(enrollmentCalls, 1, 'failure cached for TTL window');
});

test('queries listPrograms when programId is omitted, then caches the program list', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

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

  const result = await fetchLearnerProgressFromB4B('g@h.com');
  assert.equal(result.size, 2);
  assert.ok(result.get('course-of-PRG-A'));
  assert.ok(result.get('course-of-PRG-B'));
  assert.equal(listCalls, 1);
  assert.equal(enrollmentCalls, 2, 'one enrollmentReports call per program');

  // Second learner under same scope: program list should be cached.
  await fetchLearnerProgressFromB4B('i@j.com');
  assert.equal(listCalls, 1, 'listPrograms cached across calls');
});

test('averageProgramProgressFromB4B requires every courseId to be present', () => {
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

  // All present → average.
  assert.equal(
    averageProgramProgressFromB4B({ progress: map, courseraCourseIds: ['C1', 'C2'] }),
    75,
  );

  // One missing → null (caller falls back to local rollup).
  assert.equal(
    averageProgramProgressFromB4B({ progress: map, courseraCourseIds: ['C1', 'C2', 'C3'] }),
    null,
  );

  // No ids → null.
  assert.equal(
    averageProgramProgressFromB4B({ progress: map, courseraCourseIds: [] }),
    null,
  );
});

test('getLearnerProgressLastActivity returns the latest timestamp', () => {
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
  assert.equal(latest?.toISOString(), '2026-05-08T12:00:00.000Z');
});

test('empty email returns empty map without making API calls', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let calls = 0;
  _setFetchForTesting(async () => {
    calls += 1;
    return jsonResponse({});
  });

  const result = await fetchLearnerProgressFromB4B('');
  assert.equal(result.size, 0);
  assert.equal(calls, 0);
});
