#!/usr/bin/env node
 
/**
 * Wrapper around `node --test` for the project's unit tests.
 *
 * The full repo has ~191 `*.test.ts` specs but two subsets can't run
 * under `node --import tsx --test`:
 *
 *  - Tests that `import { ... } from 'vitest'` — they were authored
 *    against a different runner. Skipped until they're either ported
 *    to `node:test` or vitest is wired up properly in CI (it's
 *    declared in package.json but not currently materialized in
 *    `node_modules`).
 *
 *  - Tests whose target module imports `'server-only'` at module
 *    load — that package throws unconditionally when not run inside
 *    a Next.js server bundle. Until we add an `--import` shim for
 *    `server-only`, those tests can't load.
 *
 * Filtering happens here rather than via a glob pattern so the skip
 * list stays declarative + documented. Print the skipped files at
 * the start so the skip list is visible in CI logs.
 *
 * Vitest specs are gated by an **explicit allowlist** (see
 * `KNOWN_VITEST_SPECS` below). A new test file that imports vitest
 * and isn't in the allowlist will fail the run rather than be
 * silently skipped — that prevents "I added a vitest spec → CI
 * pretends it ran" surprises (Codex P2 catch on PR #1230).
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SKIP_REASONS = {
  vitest: "imports 'vitest' (node:test runner can't satisfy)",
  serverOnly: "imports 'server-only' (no test-env shim yet)",
  realDb: "requires a live postgres connection (no Prisma mock layer in this spec)",
};

/**
 * Explicit allowlist of test files that currently import from `vitest`
 * but are accepted as skips. Anything NEW that imports vitest will fail
 * the run with a clear message: either port the spec to `node:test` or
 * (if you really need vitest) add a separate `test:unit:vitest` lane
 * and add the file here so this gate doesn't silently swallow it.
 */
const KNOWN_VITEST_SPECS = new Set([
  'lib/admin/memberMerge.test.ts',
  'lib/admin/metrics.test.ts',
  'lib/analytics/aiToolEfficacy.test.ts',
  'lib/analytics/quarterlyOutcomes.test.ts',
  'lib/api/errors.test.ts',
  'lib/cache.test.ts',
  'lib/content/programs.test.ts',
  'lib/counselor/templates.test.ts',
  'lib/coursera/learnerProgress.test.ts',
  'lib/marketing/trustStripMetrics.test.ts',
  'lib/member/nextBestActions.test.ts',
  'lib/member/xapiVerbProgress.test.ts',
  'lib/retention/cleanup.test.ts',
  'lib/xapi/statements.test.ts',
]);

async function listTestFiles() {
  const out = [];
  for await (const entry of glob('lib/**/*.test.ts', { cwd: ROOT })) {
    out.push(entry);
  }
  return out;
}

/**
 * Returns one of:
 *   { skip: '<reason>' }       — known-incompatible, log + move on
 *   { unknownVitest: true }    — vitest import but NOT in allowlist; abort
 *   null                        — runnable
 */
function classify(relPath) {
  const src = readFileSync(path.join(ROOT, relPath), 'utf8');
  const importsVitest =
    /from\s+['"]vitest['"]/.test(src) || /require\(['"]vitest['"]\)/.test(src);
  if (importsVitest) {
    // Normalize to forward slashes so the comparison works on Windows too.
    const normalized = relPath.replace(/\\/g, '/');
    if (KNOWN_VITEST_SPECS.has(normalized)) {
      return { skip: 'vitest' };
    }
    return { unknownVitest: true };
  }
  // Check if any direct (non-test) dependency starts with `import 'server-only'`.
  // Most of these tests fail because the module under test does the import.
  // Heuristic: if the test file references `webhooks/retry`, `coursera/webhookAuth`,
  // we know those targets pull in server-only. Until we add a runtime shim,
  // skip the known-broken pair.
  if (/lib\/webhooks\/retry\.test\.ts|lib\/coursera\/webhookAuth\.test\.ts/.test(relPath)) {
    return { skip: 'serverOnly' };
  }
  if (/lib\/auth\/roles\.test\.ts/.test(relPath)) {
    // Hits the real Prisma client via getProfileRole — needs a postgres
    // server we don't have in CI. Mocking Prisma here would mean
    // rewriting the test against the wrapper rather than the real
    // function, which defeats most of its value. Daytime cleanup item.
    return { skip: 'realDb' };
  }
  return null;
}

async function main() {
  const all = (await listTestFiles()).sort();
  const runnable = [];
  const skipped = [];
  const unknownVitest = [];
  for (const file of all) {
    const result = classify(file);
    if (!result) {
      runnable.push(file);
    } else if (result.unknownVitest) {
      unknownVitest.push(file);
    } else if (result.skip) {
      skipped.push([file, result.skip]);
    }
  }

  if (unknownVitest.length > 0) {
    console.error(
      `\n❌ ${unknownVitest.length} test file(s) import 'vitest' but are not in the ` +
        `KNOWN_VITEST_SPECS allowlist in scripts/test-unit.mjs:\n`,
    );
    for (const file of unknownVitest) {
      console.error(`  - ${file}`);
    }
    console.error(
      `\nThe node:test runner can't satisfy vitest imports. Pick one:\n` +
        `  (a) Port the spec to node:test (import from 'node:test' + 'node:assert/strict').\n` +
        `  (b) Wire up a separate vitest lane in CI and add the file to KNOWN_VITEST_SPECS\n` +
        `      so this gate skips it explicitly instead of silently dropping coverage.\n`,
    );
    process.exit(1);
  }

  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} test file(s) (incompatible with node:test runner):`);
    for (const [file, reason] of skipped) {
      console.log(`  - ${file}  // ${SKIP_REASONS[reason]}`);
    }
    console.log('');
  }

  console.log(`Running ${runnable.length} test file(s) via \`node --test\`...`);

  // Stub Prisma env vars so schema.prisma validates without a real DB.
  // Tests that touch prisma typically mock the client; the URL is only
  // consulted by `prisma generate`-time validators. Real CI sets these
  // via the workflow env block; this fallback keeps `npm run test:unit`
  // green for local + autopilot runs.
  const env = { ...process.env };
  env.POSTGRES_PRISMA_URL ??= 'postgresql://test:test@localhost:5432/test';
  env.POSTGRES_URL_NON_POOLING ??= 'postgresql://test:test@localhost:5432/test';

  const child = spawn(
    'node',
    ['--import', 'tsx', '--test', ...runnable],
    { stdio: 'inherit', cwd: ROOT, env },
  );
  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
