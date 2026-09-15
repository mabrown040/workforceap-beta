'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEMO_REF,
  PROD_REF,
  inspectSupabaseEnvironment,
  projectForAnonKey,
} = require('./supabase-project-guard.cjs');

const STRICT = { requireVercel: true, requireDirectUrl: true };

/** Synthetic legacy anon key. Signature is fake; the guard only reads claims. */
function legacyKey(ref, role = 'anon') {
  const payload = Buffer.from(JSON.stringify({ iss: 'supabase', ref, role })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.not-a-real-signature`;
}

function vercelEnv(project, overrides = {}) {
  const ref = project === 'prod' ? PROD_REF : DEMO_REF;
  return {
    VERCEL: '1',
    VERCEL_ENV: project === 'prod' ? 'production' : 'preview',
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: legacyKey(ref),
    POSTGRES_PRISMA_URL: `postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`,
    POSTGRES_URL_NON_POOLING: `postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`,
    ...overrides,
  };
}

test('a fully wired production environment passes', () => {
  const result = inspectSupabaseEnvironment(vercelEnv('prod'), STRICT);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.classifications.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'prod');
});

test('a production build with no anon key is blocked (regression: 2026-09-15 auth outage)', () => {
  // Reproduces the shipped incident: every other signal was healthy — the
  // public URL, both database URLs and the deployed /api/health/ready probe —
  // so the build passed and production served sign-in and signup that threw
  // "Missing Supabase environment variables" on every request.
  for (const missing of ['', undefined]) {
    const result = inspectSupabaseEnvironment(
      vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: missing }),
      STRICT,
    );
    assert.equal(result.ok, false, `anon key ${JSON.stringify(missing)} should fail closed`);
    assert.ok(
      result.errors.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY is required on Vercel.'),
      `expected the required-key error, got ${JSON.stringify(result.errors)}`,
    );
    // The URL alone must not be enough to satisfy the guard.
    assert.equal(result.classifications.NEXT_PUBLIC_SUPABASE_URL, 'prod');
  }
});

test('an anon key from the wrong Supabase project is blocked in both directions', () => {
  const demoKeyInProd = inspectSupabaseEnvironment(
    vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: legacyKey(DEMO_REF) }),
    STRICT,
  );
  assert.equal(demoKeyInProd.ok, false);
  assert.ok(
    demoKeyInProd.errors.some((message) =>
      /NEXT_PUBLIC_SUPABASE_ANON_KEY points at the wrong Supabase project/.test(message)),
    JSON.stringify(demoKeyInProd.errors),
  );

  const prodKeyInPreview = inspectSupabaseEnvironment(
    vercelEnv('demo', { NEXT_PUBLIC_SUPABASE_ANON_KEY: legacyKey(PROD_REF) }),
    STRICT,
  );
  assert.equal(prodKeyInPreview.ok, false);
  assert.ok(
    prodKeyInPreview.errors.some((message) =>
      /NEXT_PUBLIC_SUPABASE_ANON_KEY points at the wrong Supabase project/.test(message)),
    JSON.stringify(prodKeyInPreview.errors),
  );
});

test('a service-role key in the public anon variable is refused', () => {
  // NEXT_PUBLIC_* is inlined into client bundles, so a service-role key here
  // would hand full database access to every visitor.
  const result = inspectSupabaseEnvironment(
    vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: legacyKey(PROD_REF, 'service_role') }),
    STRICT,
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.includes(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY does not identify an approved Supabase project.',
    ),
    JSON.stringify(result.errors),
  );
});

test('a modern publishable key satisfies the requirement without a project claim', () => {
  // sb_publishable_... keys carry no project ref, so presence is all that can
  // be checked. Requiring a ref would block a legitimate key rotation.
  const result = inspectSupabaseEnvironment(
    vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_AbC123_xyz-789' }),
    STRICT,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.classifications.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'opaque');
});

test('a malformed anon key is refused rather than assumed valid', () => {
  for (const malformed of ['not-a-key', 'a.b', 'a.!!!not-base64!!!.c']) {
    const result = inspectSupabaseEnvironment(
      vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: malformed }),
      STRICT,
    );
    assert.equal(result.ok, false, `${malformed} should not pass`);
  }
});

test('guard output never carries anon key material', () => {
  const secretish = legacyKey(DEMO_REF);
  const result = inspectSupabaseEnvironment(
    vercelEnv('prod', { NEXT_PUBLIC_SUPABASE_ANON_KEY: secretish }),
    STRICT,
  );
  const serialized = JSON.stringify(result);
  assert.equal(result.ok, false);
  assert.ok(!serialized.includes(secretish), 'full key leaked into guard result');
  assert.ok(
    !serialized.includes(secretish.split('.')[1]),
    'key payload segment leaked into guard result',
  );
});

test('projectForAnonKey classifies each shape', () => {
  assert.equal(projectForAnonKey(''), 'unset');
  assert.equal(projectForAnonKey(legacyKey(PROD_REF)), 'prod');
  assert.equal(projectForAnonKey(legacyKey(DEMO_REF)), 'demo');
  assert.equal(projectForAnonKey(legacyKey('someunrelatedproject')), 'unknown');
  assert.equal(projectForAnonKey('sb_publishable_AbC123_xyz-789'), 'opaque');
  assert.equal(projectForAnonKey('garbage'), 'unknown');
});
