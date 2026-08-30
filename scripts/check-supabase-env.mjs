#!/usr/bin/env node
/**
 * Supabase env guard — prevents pointing the wrong environment at the wrong DB.
 *
 *   Preview / Development  MUST use the DEMO project (esbdrgaonplpvzmtrdhw)
 *   Production             MUST use the REAL project (jqddnyuszufndwwezdwp)
 *
 * Run in CI / as a predeploy / build step. Reads NEXT_PUBLIC_SUPABASE_URL and
 * the connection URLs and fails loud if a scope is wired to the wrong project.
 *
 * Exit 0 = ok, 1 = misconfigured (block the deploy).
 */

import guard from './lib/supabase-project-guard.cjs';

const {
  DEMO_REF,
  PROD_REF,
  inspectSupabaseEnvironment,
  projectForUrl,
} = guard;

// VERCEL_ENV is 'production' | 'preview' | 'development'. Fall back to NODE_ENV.
// CI uses stub DB URLs, but Vercel also sets CI=1. A real Vercel deployment
// must never bypass this guard before a database-mutating build command.
if (
  process.env.VERCEL !== '1' &&
  (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true')
) {
  console.log('[supabase-env-guard] CI — skipping project ref check');
  process.exit(0);
}

const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

const urls = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL || '',
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
};

const expected = env === 'production' ? 'prod' : 'demo';
const errors = [];
const seen = {};

for (const [name, value] of Object.entries(urls)) {
  const ref = projectForUrl(value, name === 'NEXT_PUBLIC_SUPABASE_URL' ? 'public' : 'database');
  seen[name] = ref;
  if (ref === 'unset' || ref === 'unknown') continue; // don't fail on unset here
  if (ref !== expected) {
    errors.push(
      `  ✗ ${name} points at the ${ref.toUpperCase()} project, but VERCEL_ENV="${env}" must use ${expected.toUpperCase()}.`
    );
  }
}

if (process.env.VERCEL === '1') {
  const strict = inspectSupabaseEnvironment(process.env, {
    requireVercel: true,
    requireDirectUrl: true,
  });
  errors.push(...strict.errors.map((message) => `  ✗ ${message}`));
}

console.log(`[supabase-env-guard] env=${env} expected=${expected} →`, seen);

if (errors.length) {
  console.error('\n[supabase-env-guard] BLOCKED — wrong Supabase project for this environment:');
  console.error(errors.join('\n'));
  console.error(
    `\nFix: in Vercel, the Preview + Development scopes must use the DEMO project (${DEMO_REF}); ` +
      `Production must use the real project (${PROD_REF}). See docs/STAGING_ENV.md.\n`
  );
  process.exit(1);
}

console.log('[supabase-env-guard] OK — environment is wired to the correct Supabase project.');
