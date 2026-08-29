import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ORG_BRANDING_CACHE_TTL_MS,
  cachedOrgBranding,
  clearOrgBrandingCache,
  getCachedOrgBranding,
} from './orgBrandingCache';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('cachedOrgBranding hits process cache within TTL (mock clock)', async () => {
  clearOrgBrandingCache();
  let loads = 0;
  const load = async () => {
    loads += 1;
    return { primaryColor: '#c41e3a', logo: 'logo.png' };
  };

  const first = await cachedOrgBranding('org-custom', load, 1_000);
  const second = await cachedOrgBranding('org-custom', load, 1_000 + 30_000);
  assert.deepEqual(first, { primaryColor: '#c41e3a', logo: 'logo.png' });
  assert.deepEqual(second, first);
  assert.equal(loads, 1);
  assert.deepEqual(getCachedOrgBranding('org-custom', 1_000 + 30_000), first);
});

test('cachedOrgBranding misses after TTL and reloads', async () => {
  clearOrgBrandingCache();
  let loads = 0;
  const load = async () => {
    loads += 1;
    return { primaryColor: loads === 1 ? '#111111' : '#222222', logo: null };
  };

  const t0 = 10_000;
  const first = await cachedOrgBranding('org-ttl', load, t0);
  assert.equal(first.primaryColor, '#111111');
  assert.equal(getCachedOrgBranding('org-ttl', t0 + ORG_BRANDING_CACHE_TTL_MS), null);
  const expired = await cachedOrgBranding('org-ttl', load, t0 + ORG_BRANDING_CACHE_TTL_MS);
  assert.equal(expired.primaryColor, '#222222');
  assert.equal(loads, 2);
});

test('cachedOrgBranding isolates orgs', async () => {
  clearOrgBrandingCache();
  const a = await cachedOrgBranding('org-a', async () => ({ primaryColor: '#aaaaaa', logo: null }), 0);
  const b = await cachedOrgBranding('org-b', async () => ({ primaryColor: '#bbbbbb', logo: null }), 0);
  assert.equal(a.primaryColor, '#aaaaaa');
  assert.equal(b.primaryColor, '#bbbbbb');
});

test('getRequestOrgBranding caches custom-domain orgs instead of raw Prisma', () => {
  const src = readFileSync(join(ROOT, 'lib/platform/defaultOrgTheme.ts'), 'utf8');
  assert.match(src, /cachedOrgBranding/);
  assert.match(src, /getOrgBrandingById/);
  assert.match(src, /org-branding/);
  assert.match(src, /revalidate:\s*ORG_BRANDING_CACHE_TTL_SECONDS/);
  assert.match(src, /opts\.readOnlyAudit[\s\S]*Promise\.resolve\(\{ primaryColor: null, logo: null \}\)/);
  assert.match(src, /if \(opts\.readOnlyAudit\) return \{ primaryColor: null, logo: null \}/);
});
