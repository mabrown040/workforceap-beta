/**
 * Track E (Sprint E.1 PR 2) — unit tests for getOrganizationBranding.
 *
 * The helper is the seam every parameterized email template reads its
 * brand bundle through. These tests guarantee:
 *   - Defaults are applied when orgId is missing or the row is null
 *   - Org-row values override defaults (name, color, custom domain, logo)
 *   - Invalid hex colors fall back to the default accent (no XSS / no junk)
 *   - The 60s TTL cache hits on a second call within the window
 *   - clearOrganizationBrandingCache() invalidates an entry
 *
 * We pass a fake fetcher via the `options.fetcher` injection point so
 * the test never touches Prisma. The helper's "fall back to defaults on
 * fetch error" path is also covered.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrganizationBranding,
  clearOrganizationBrandingCache,
  getDefaultBrandingForTests,
  type OrganizationBrandingRow,
} from './organizationBranding';

function makeFetcher(rows: Record<string, OrganizationBrandingRow | null>) {
  let calls = 0;
  const fetcher = async (orgId: string) => {
    calls++;
    return rows[orgId] ?? null;
  };
  return {
    fetcher,
    get calls() {
      return calls;
    },
  };
}

// Each test starts with a clean cache so the TTL semantics are exercised
// independently. The helper is module-scope; this matters.
test.beforeEach(() => clearOrganizationBrandingCache());

test('returns default bundle when orgId is null', async () => {
  const branding = await getOrganizationBranding(null);
  assert.equal(branding.name, 'Workforce Advancement Project');
  assert.equal(branding.primaryColor, '#ad2c4d');
  assert.equal(branding.orgId, null);
  assert.match(branding.logoUrl, /\/images\/wap_logo\.png$/);
});

test('returns default bundle when orgId is empty string', async () => {
  const branding = await getOrganizationBranding('   ');
  assert.equal(branding.orgId, null);
  assert.equal(branding.name, 'Workforce Advancement Project');
});

test('returns default bundle when fetcher resolves null (org not found)', async () => {
  const { fetcher } = makeFetcher({});
  const branding = await getOrganizationBranding('missing-org', { fetcher });
  assert.equal(branding.orgId, null);
  assert.equal(branding.name, 'Workforce Advancement Project');
});

test('overrides defaults with org row values', async () => {
  const { fetcher } = makeFetcher({
    'org-aaul': {
      id: 'org-aaul',
      name: 'AAUL',
      logo: 'https://cdn.example.com/aaul-logo.png',
      primaryColor: '#0066ff',
      customDomain: 'aaul.example.com',
    },
  });
  const branding = await getOrganizationBranding('org-aaul', { fetcher });
  assert.equal(branding.orgId, 'org-aaul');
  assert.equal(branding.name, 'AAUL');
  assert.equal(branding.primaryColor, '#0066ff');
  assert.equal(branding.logoUrl, 'https://cdn.example.com/aaul-logo.png');
  assert.equal(branding.domain, 'https://aaul.example.com');
  assert.equal(branding.domainLabel, 'aaul.example.com');
});

test('preserves custom domain that already includes scheme', async () => {
  const { fetcher } = makeFetcher({
    'org-aaul': {
      id: 'org-aaul',
      name: 'AAUL',
      logo: null,
      primaryColor: null,
      customDomain: 'http://aaul.localhost:3000',
    },
  });
  const branding = await getOrganizationBranding('org-aaul', { fetcher });
  assert.equal(branding.domain, 'http://aaul.localhost:3000');
  assert.equal(branding.domainLabel, 'aaul.localhost:3000');
});

test('rejects invalid hex color and falls back to default accent', async () => {
  const defaults = getDefaultBrandingForTests();
  const { fetcher } = makeFetcher({
    'org-bad': {
      id: 'org-bad',
      name: 'BadColor Org',
      logo: null,
      primaryColor: 'not-a-color',
      customDomain: null,
    },
  });
  const branding = await getOrganizationBranding('org-bad', { fetcher });
  assert.equal(branding.primaryColor, defaults.primaryColor);
  assert.equal(branding.name, 'BadColor Org');
});

test('rejects 3-digit hex shorthand (require #RRGGBB)', async () => {
  const defaults = getDefaultBrandingForTests();
  const { fetcher } = makeFetcher({
    'org-short': {
      id: 'org-short',
      name: 'Short Hex',
      logo: null,
      primaryColor: '#abc',
      customDomain: null,
    },
  });
  const branding = await getOrganizationBranding('org-short', { fetcher });
  assert.equal(branding.primaryColor, defaults.primaryColor);
});

test('falls back to default name when org name is empty/whitespace', async () => {
  const { fetcher } = makeFetcher({
    'org-empty': {
      id: 'org-empty',
      name: '   ',
      logo: null,
      primaryColor: null,
      customDomain: null,
    },
  });
  const branding = await getOrganizationBranding('org-empty', { fetcher });
  assert.equal(branding.name, 'Workforce Advancement Project');
});

test('cache hits on second call within TTL window (fetcher called once)', async () => {
  const cache = makeFetcher({
    'org-cached': {
      id: 'org-cached',
      name: 'Cached Org',
      logo: null,
      primaryColor: null,
      customDomain: null,
    },
  });
  await getOrganizationBranding('org-cached', { fetcher: cache.fetcher });
  await getOrganizationBranding('org-cached', { fetcher: cache.fetcher });
  await getOrganizationBranding('org-cached', { fetcher: cache.fetcher });
  assert.equal(cache.calls, 1, 'fetcher should run once across three calls');
});

test('clearOrganizationBrandingCache(orgId) invalidates a single entry', async () => {
  const cache = makeFetcher({
    'org-a': {
      id: 'org-a',
      name: 'Org A',
      logo: null,
      primaryColor: null,
      customDomain: null,
    },
    'org-b': {
      id: 'org-b',
      name: 'Org B',
      logo: null,
      primaryColor: null,
      customDomain: null,
    },
  });
  await getOrganizationBranding('org-a', { fetcher: cache.fetcher });
  await getOrganizationBranding('org-b', { fetcher: cache.fetcher });
  assert.equal(cache.calls, 2);

  clearOrganizationBrandingCache('org-a');
  await getOrganizationBranding('org-a', { fetcher: cache.fetcher }); // refetched
  await getOrganizationBranding('org-b', { fetcher: cache.fetcher }); // still cached
  assert.equal(cache.calls, 3);
});

test('caches the default bundle when org row is missing (no thundering herd on bad ids)', async () => {
  const cache = makeFetcher({});
  await getOrganizationBranding('ghost-org', { fetcher: cache.fetcher });
  await getOrganizationBranding('ghost-org', { fetcher: cache.fetcher });
  assert.equal(cache.calls, 1, 'second lookup hits cache even for missing rows');
});

test('falls back to default bundle when fetcher throws', async () => {
  const fetcher = async () => {
    throw new Error('DB unavailable');
  };
  const branding = await getOrganizationBranding('org-xyz', { fetcher });
  assert.equal(branding.name, 'Workforce Advancement Project');
  assert.equal(branding.orgId, null);
});
