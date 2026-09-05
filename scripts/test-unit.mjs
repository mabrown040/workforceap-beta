#!/usr/bin/env node
 
/**
 * Wrapper around `node --test` for the project's unit tests.
 *
 * Library suites that import Vitest run in `npm run test:vitest`, not here.
 * Both runners share scripts/vitest-library-specs.mjs, and the Vitest
 * collection guard proves those suites are not excluded from that lane.
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
 * Vitest specs are gated by an **explicit shared manifest**. A new test file that imports vitest
 * and isn't in the allowlist will fail the run rather than be
 * silently skipped — that prevents "I added a vitest spec → CI
 * pretends it ran" surprises (Codex P2 catch on PR #1230).
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VITEST_LIBRARY_SPECS } from './vitest-library-specs.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SKIP_REASONS = {
  vitest: "owned by npm run test:vitest (shared manifest; collection guarded)",
  serverOnly: "imports 'server-only' (no test-env shim yet)",
  realDb: "requires a live postgres connection (no Prisma mock layer in this spec)",
};

/**
 * Explicit shared ownership: these suites run in the required Vitest lane.
 * Unknown Vitest suites fail here until registered, instead of silently
 * being dropped from Node coverage.
 */
const KNOWN_VITEST_SPECS = new Set(VITEST_LIBRARY_SPECS);

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
  const normalized = relPath.replace(/\\/g, '/');
  const importsVitest =
    /from\s+['"]vitest['"]/.test(src) || /require\(['"]vitest['"]\)/.test(src);
  if (importsVitest) {
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
  if (/lib\/webhooks\/retry\.test\.ts|lib\/coursera\/webhookAuth\.test\.ts/.test(normalized)) {
    return { skip: 'serverOnly' };
  }
  if (/lib\/auth\/roles\.test\.ts/.test(normalized)) {
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
        `shared manifest in scripts/vitest-library-specs.mjs:\n`,
    );
    for (const file of unknownVitest) {
      console.error(`  - ${file}`);
    }
    console.error(
      `\nThe node:test runner can't satisfy vitest imports. Pick one:\n` +
        `  (a) Port the spec to node:test (import from 'node:test' + 'node:assert/strict').\n` +
        `  (b) Add the file to VITEST_LIBRARY_SPECS and run npm run test:vitest.\n` +
        `      The collection guard ensures the required Vitest lane includes it.\n`,
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
