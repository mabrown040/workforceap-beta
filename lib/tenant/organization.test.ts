import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { resolveDevDefaultOrgIdFallback } from './organization';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('resolveDevDefaultOrgIdFallback returns null on Vercel production', () => {
  process.env.VERCEL_ENV = 'production';
  process.env.__PRISMA_PLACEHOLDER_DB = '1';
  assert.equal(resolveDevDefaultOrgIdFallback(), null);
});

test('resolveDevDefaultOrgIdFallback prefers WAP_DEV_DEFAULT_ORG_ID', () => {
  delete process.env.CURSOR_AGENT;
  delete process.env.WAP_REQUIRE_SUPABASE;
  process.env.WAP_DEV_DEFAULT_ORG_ID = 'org-from-env';
  process.env.__PRISMA_PLACEHOLDER_DB = '1';
  assert.equal(resolveDevDefaultOrgIdFallback(), 'org-from-env');
});

test('resolveDevDefaultOrgIdFallback uses seeded org for placeholder DB', () => {
  delete process.env.CURSOR_AGENT;
  delete process.env.WAP_REQUIRE_SUPABASE;
  delete process.env.WAP_DEV_DEFAULT_ORG_ID;
  process.env.__PRISMA_PLACEHOLDER_DB = '1';
  assert.equal(resolveDevDefaultOrgIdFallback(), '00000000-0000-4000-8000-000000000001');
});

test('resolveDevDefaultOrgIdFallback returns null for cloud agents (real Supabase required)', () => {
  process.env.CURSOR_AGENT = '1';
  process.env.__PRISMA_PLACEHOLDER_DB = '1';
  assert.equal(resolveDevDefaultOrgIdFallback(), null);
});

test('resolveDevDefaultOrgIdFallback returns null when WAP_REQUIRE_SUPABASE is set', () => {
  process.env.WAP_REQUIRE_SUPABASE = '1';
  process.env.__PRISMA_PLACEHOLDER_DB = '1';
  assert.equal(resolveDevDefaultOrgIdFallback(), null);
});

test('resolveDevDefaultOrgIdFallback returns null without placeholder or env override', () => {
  delete process.env.CURSOR_AGENT;
  delete process.env.WAP_REQUIRE_SUPABASE;
  delete process.env.WAP_DEV_DEFAULT_ORG_ID;
  delete process.env.__PRISMA_PLACEHOLDER_DB;
  assert.equal(resolveDevDefaultOrgIdFallback(), null);
});
