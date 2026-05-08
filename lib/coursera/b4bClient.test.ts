import test from 'node:test';
import assert from 'node:assert/strict';

import {
  B4BApiError,
  _getCachedTokenForTesting,
  _resetTokenCacheForTesting,
  _setFetchForTesting,
  fetchB4B,
  getEnrollmentReports,
  getOrgInfo,
  listPrograms,
  listUsers,
} from './b4bClient';

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

function jsonResponse(payload: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

type Call = { url: string; init?: RequestInit };

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

test('first call fetches token then makes the API request', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  const calls: Call[] = [];
  _setFetchForTesting(async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/oauth2/client_credentials/token')) {
      return jsonResponse({ access_token: 'tok-A', token_type: 'Bearer', expires_in: 1799 });
    }
    return jsonResponse({ id: 'TEST_ORG_ID', name: 'Workforce Advancement Project' });
  });

  const orgInfo = await getOrgInfo();
  assert.equal(orgInfo.name, 'Workforce Advancement Project');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/oauth2\/client_credentials\/token$/);
  assert.equal(calls[1].url, 'https://api.coursera.com/ent/api/businesses.v1/TEST_ORG_ID');

  // Verify Authorization headers
  const tokenAuth = (calls[0].init?.headers as Record<string, string> | undefined)?.Authorization;
  assert.ok(tokenAuth?.startsWith('Basic '), 'token request uses Basic auth');
  // The Bearer header is set as a Headers instance, but Headers is iterable.
  const apiHeaders = new Headers(calls[1].init?.headers);
  assert.equal(apiHeaders.get('Authorization'), 'Bearer tok-A');
});

test('second call within TTL reuses cached token (no second oauth fetch)', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let oauthCalls = 0;
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/client_credentials/token')) {
      oauthCalls += 1;
      return jsonResponse({ access_token: 'tok-B', expires_in: 1799 });
    }
    return jsonResponse({ elements: [], paging: { total: 0 } });
  });

  await listUsers({ limit: 5 });
  await listUsers({ limit: 5 });
  await listUsers({ limit: 5 });

  assert.equal(oauthCalls, 1, 'OAuth token reused across three API calls');

  const cached = _getCachedTokenForTesting();
  assert.ok(cached);
  assert.equal(cached?.token, 'tok-B');
  assert.ok(cached!.expiresAt > Date.now() + 60_000);
});

test('token near-expiry triggers a refresh on the next call', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let oauthCalls = 0;
  let tokenLabel = 'tok-1';
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/client_credentials/token')) {
      oauthCalls += 1;
      const issued = tokenLabel;
      tokenLabel = 'tok-2';
      return jsonResponse({ access_token: issued, expires_in: 1799 });
    }
    return jsonResponse({ id: 'TEST_ORG_ID', name: 'WAP' });
  });

  await getOrgInfo();
  assert.equal(oauthCalls, 1);

  // Force the cached token to be on the brink of expiry (within the 60s
  // safety margin). The next call should refresh.
  const cached = _getCachedTokenForTesting();
  assert.ok(cached);
  cached!.expiresAt = Date.now() + 5_000; // 5s left

  await getOrgInfo();
  assert.equal(oauthCalls, 2, 'token refreshed when within safety margin');

  const cached2 = _getCachedTokenForTesting();
  assert.equal(cached2?.token, 'tok-2', 'new token cached');
});

test('non-2xx API response throws B4BApiError with status, body, url', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/client_credentials/token')) {
      return jsonResponse({ access_token: 'tok', expires_in: 1799 });
    }
    return textResponse('{"errorCode":"FORBIDDEN","details":"bad scope"}', 403);
  });

  await assert.rejects(
    () => listPrograms({ limit: 5 }),
    (err: unknown) => {
      if (!(err instanceof B4BApiError)) return false;
      assert.equal(err.status, 403);
      assert.match(err.body, /FORBIDDEN/);
      assert.match(err.url, /\/businesses\.v1\/TEST_ORG_ID\/programs/);
      return true;
    },
  );
});

test('listPrograms forces excludeContent=true unless caller opts out', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  const urls: string[] = [];
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/')) {
      return jsonResponse({ access_token: 'tok', expires_in: 1799 });
    }
    urls.push(url);
    return jsonResponse({ elements: [], paging: { total: 0 } });
  });

  await listPrograms({ limit: 5 });
  assert.match(urls[0], /excludeContent=true/);

  await listPrograms({ limit: 5, excludeContent: false });
  assert.match(urls[1], /excludeContent=false/);
});

test('getEnrollmentReports encodes byProgramId and byUserProgramId param shape', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  const urls: string[] = [];
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/')) {
      return jsonResponse({ access_token: 'tok', expires_in: 1799 });
    }
    urls.push(url);
    return jsonResponse({ elements: [], paging: { total: 0 } });
  });

  await getEnrollmentReports({ byProgramId: true, programId: 'PRG-123', limit: 50 });
  await getEnrollmentReports({
    byUserProgramId: true,
    programId: 'PRG-123',
    externalId: 'drew@example.com',
    limit: 50,
  });

  // q=byProgramId&programId=PRG-123&limit=50
  const u1 = new URL(urls[0]);
  assert.equal(u1.searchParams.get('q'), 'byProgramId');
  assert.equal(u1.searchParams.get('programId'), 'PRG-123');
  assert.equal(u1.searchParams.get('limit'), '50');

  // q=byUserProgramId&programId=PRG-123&externalId=drew@example.com
  const u2 = new URL(urls[1]);
  assert.equal(u2.searchParams.get('q'), 'byUserProgramId');
  assert.equal(u2.searchParams.get('programId'), 'PRG-123');
  assert.equal(u2.searchParams.get('externalId'), 'drew@example.com');
});

test('OAuth failure throws B4BApiError before any API call', async (t) => {
  setupTestEnv();
  t.after(teardownTestEnv);

  let apiCalls = 0;
  _setFetchForTesting(async (url) => {
    if (url.includes('/oauth2/')) {
      return textResponse('invalid_client', 401);
    }
    apiCalls += 1;
    return jsonResponse({});
  });

  await assert.rejects(
    () => fetchB4B('/api/businesses.v1/TEST_ORG_ID'),
    (err: unknown) =>
      err instanceof B4BApiError && err.status === 401 && err.body.includes('invalid_client'),
  );
  assert.equal(apiCalls, 0, 'no API call attempted when OAuth fails');
});

test('module load throws when credentials are missing (deferred to first call)', async (t) => {
  snapshotEnv();
  delete process.env.COURSERA_B4B_CLIENT_ID;
  delete process.env.COURSERA_B4B_CLIENT_SECRET;
  _resetTokenCacheForTesting();
  t.after(() => {
    restoreEnv();
    _resetTokenCacheForTesting();
    _setFetchForTesting(null);
  });

  _setFetchForTesting(async () => {
    throw new Error('fetch should not be called when creds are missing');
  });

  await assert.rejects(
    () => listUsers(),
    (err: unknown) =>
      err instanceof Error && /COURSERA_B4B_CLIENT_ID/.test(err.message),
  );
});
