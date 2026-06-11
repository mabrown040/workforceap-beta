import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveOrgFromRequest,
  tryResolveOrgFromRequest,
  WAP_HOST_HEADER,
  WAP_ORG_ID_HEADER,
} from './resolveOrgFromRequest';
import { NO_ORG_SENTINEL, type CustomDomainCache } from './customDomainCache';

// Helpers ---------------------------------------------------------------

function makeHeaders(map: Record<string, string>): { get(name: string): string | null } {
  const lower = new Map<string, string>();
  for (const [k, v] of Object.entries(map)) lower.set(k.toLowerCase(), v);
  return {
    get(name: string) {
      return lower.get(name.toLowerCase()) ?? null;
    },
  };
}

function makeFakeCache(): CustomDomainCache & { calls: { get: number; set: number } } {
  const store = new Map<string, string>();
  const calls = { get: 0, set: 0 };
  return {
    calls,
    get(host) {
      calls.get++;
      return store.get(host) ?? null;
    },
    set(host, orgId) {
      calls.set++;
      store.set(host, orgId ?? NO_ORG_SENTINEL);
    },
    delete(host) {
      store.delete(host);
    },
    clear() {
      store.clear();
    },
    size() {
      return store.size;
    },
  };
}

const FAKE_DEFAULT_ORG = 'default-org-id';
const fakeDefaultOrgId = async () => FAKE_DEFAULT_ORG;

const FAKE_HOST_MAP: Record<string, string> = {
  'aaul.workforceap.org': 'org-aaul-123',
  'portal.example.org': 'org-example-456',
};

const fakeLookup = async (host: string): Promise<string | null> => {
  return FAKE_HOST_MAP[host] ?? null;
};

// Tests -----------------------------------------------------------------

test('resolveOrgFromRequest: canonical host returns default org', async () => {
  const headers = makeHeaders({ host: 'workforceap.org' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, FAKE_DEFAULT_ORG);
  // No cache or lookup work happens for canonical hosts.
  assert.equal(cache.calls.get, 0);
  assert.equal(cache.calls.set, 0);
});

test('resolveOrgFromRequest: localhost returns default org', async () => {
  const headers = makeHeaders({ host: 'localhost:3000' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, FAKE_DEFAULT_ORG);
});

test('resolveOrgFromRequest: vercel preview returns default org', async () => {
  const headers = makeHeaders({ host: 'workforceap-beta-abc.vercel.app' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, FAKE_DEFAULT_ORG);
});

test('resolveOrgFromRequest: matching customDomain returns the orgId', async () => {
  const headers = makeHeaders({ host: 'aaul.workforceap.org' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, 'org-aaul-123');
});

test('resolveOrgFromRequest: case-insensitive host matching', async () => {
  const headers = makeHeaders({ host: 'AAUL.WorkforceAP.ORG' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, 'org-aaul-123');
});

test('resolveOrgFromRequest: port number is stripped before lookup', async () => {
  const headers = makeHeaders({ host: 'aaul.workforceap.org:3000' });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, 'org-aaul-123');
});

test('resolveOrgFromRequest: cache hit on second call avoids DB lookup', async () => {
  const headers = makeHeaders({ host: 'aaul.workforceap.org' });
  const cache = makeFakeCache();
  let lookupCalls = 0;
  const countingLookup = async (host: string) => {
    lookupCalls++;
    return fakeLookup(host);
  };

  const first = await resolveOrgFromRequest(headers, {
    cache,
    lookup: countingLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  const second = await resolveOrgFromRequest(headers, {
    cache,
    lookup: countingLookup,
    defaultOrgId: fakeDefaultOrgId,
  });

  assert.equal(first, 'org-aaul-123');
  assert.equal(second, 'org-aaul-123');
  // First call hits the lookup, second call should NOT.
  assert.equal(lookupCalls, 1);
});

test('resolveOrgFromRequest: unknown customDomain caches NO_ORG_SENTINEL and falls back', async () => {
  const headers = makeHeaders({ host: 'unknown.example.com' });
  const cache = makeFakeCache();
  let lookupCalls = 0;
  const countingLookup = async (host: string) => {
    lookupCalls++;
    return fakeLookup(host);
  };

  const first = await resolveOrgFromRequest(headers, {
    cache,
    lookup: countingLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  const second = await resolveOrgFromRequest(headers, {
    cache,
    lookup: countingLookup,
    defaultOrgId: fakeDefaultOrgId,
  });

  assert.equal(first, FAKE_DEFAULT_ORG);
  assert.equal(second, FAKE_DEFAULT_ORG);
  // First call hits DB, second call uses NO_ORG_SENTINEL cache entry.
  assert.equal(lookupCalls, 1);
});

test('resolveOrgFromRequest: x-wap-org-id header short-circuits resolution', async () => {
  // x-wap-org-id is only trusted alongside x-wap-host (proves middleware
  // set it rather than a spoofing client).
  const headers = makeHeaders({
    host: 'aaul.workforceap.org',
    [WAP_HOST_HEADER]: 'aaul.workforceap.org',
    [WAP_ORG_ID_HEADER]: 'pre-resolved-org-id',
  });
  const cache = makeFakeCache();
  let lookupCalls = 0;
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: async (h) => {
      lookupCalls++;
      return fakeLookup(h);
    },
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, 'pre-resolved-org-id');
  assert.equal(lookupCalls, 0);
});

test('resolveOrgFromRequest: x-wap-org-id without x-wap-host is NOT trusted (spoof guard)', async () => {
  const headers = makeHeaders({
    host: 'aaul.workforceap.org',
    [WAP_ORG_ID_HEADER]: 'attacker-supplied-org-id',
  });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.notEqual(result, 'attacker-supplied-org-id');
  assert.equal(result, 'org-aaul-123');
});

test('resolveOrgFromRequest: prefers x-wap-host over raw host header', async () => {
  // Edge-set normalized host header should be preferred.
  const headers = makeHeaders({
    host: 'workforceap.org', // canonical
    [WAP_HOST_HEADER]: 'aaul.workforceap.org', // tenant
  });
  const cache = makeFakeCache();
  const result = await resolveOrgFromRequest(headers, {
    cache,
    lookup: fakeLookup,
    defaultOrgId: fakeDefaultOrgId,
  });
  assert.equal(result, 'org-aaul-123');
});

test('tryResolveOrgFromRequest: canonical host returns null (no default fallback)', async () => {
  const headers = makeHeaders({ host: 'workforceap.org' });
  const cache = makeFakeCache();
  const result = await tryResolveOrgFromRequest(headers, { cache, lookup: fakeLookup });
  assert.equal(result, null);
});

test('tryResolveOrgFromRequest: matching customDomain returns the orgId', async () => {
  const headers = makeHeaders({ host: 'portal.example.org' });
  const cache = makeFakeCache();
  const result = await tryResolveOrgFromRequest(headers, { cache, lookup: fakeLookup });
  assert.equal(result, 'org-example-456');
});

test('tryResolveOrgFromRequest: unknown customDomain returns null', async () => {
  const headers = makeHeaders({ host: 'nope.example.com' });
  const cache = makeFakeCache();
  const result = await tryResolveOrgFromRequest(headers, { cache, lookup: fakeLookup });
  assert.equal(result, null);
});
