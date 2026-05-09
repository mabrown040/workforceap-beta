#!/usr/bin/env node
/**
 * Guards `lib/content/courseraDiscoveredCatalog.ts` against new
 * `TODO_courseId_<N>` placeholder entries.
 *
 * Background
 * ----------
 * The catalog maps every Coursera course in WorkforceAP's program offerings
 * to its real Coursera `courseId`. When a course can't be matched against
 * the B4B `listContents` API, the backfill script leaves a placeholder so
 * the rest of the catalog still builds. The ingestion path
 * (`lib/coursera/syncUserFromB4B.ts` and
 * `lib/member/memberProgramTrainingView.ts`) silently SKIPS any course
 * whose `courseId` starts with `TODO_`, which means learners enrolled in
 * affected programs lose their progress on the dashboard.
 *
 * The proper fix is to run
 * `node scripts/backfill-coursera-courseids.cjs --write` with B4B
 * credentials, but until that happens we want a CI guard that prevents
 * the situation from getting WORSE (new placeholders sneaking in).
 *
 * Behavior
 * --------
 *   - Counts occurrences of the substring `TODO_courseId_` in the catalog.
 *   - If env var `COURSERA_CATALOG_ALLOW_PLACEHOLDERS` is set to a
 *     non-empty string: prints a warning and exits 0 (advisory mode).
 *     This lets the guard land green today even though placeholders
 *     exist; a follow-up PR can flip it to enforcing once the backfill
 *     script has been run with real credentials.
 *   - Otherwise: prints a clear error message including the count and
 *     the line numbers, then exits 1.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');
const CATALOG_REL = 'lib/content/courseraDiscoveredCatalog.ts';
const CATALOG_ABS = resolve(REPO_ROOT, CATALOG_REL);
const NEEDLE = 'TODO_courseId_';

function main() {
  let source;
  try {
    source = readFileSync(CATALOG_ABS, 'utf8');
  } catch (err) {
    console.error(
      `[check-coursera-catalog-placeholders] could not read ${CATALOG_REL}: ${err.message}`,
    );
    process.exit(2);
  }

  const lines = source.split('\n');
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let from = 0;
    while (true) {
      const idx = line.indexOf(NEEDLE, from);
      if (idx === -1) break;
      matches.push({ line: i + 1, col: idx + 1, text: line.trim() });
      from = idx + NEEDLE.length;
    }
  }

  const count = matches.length;
  const bypass = (process.env.COURSERA_CATALOG_ALLOW_PLACEHOLDERS ?? '').trim() !== '';

  if (count === 0) {
    console.log(
      `[check-coursera-catalog-placeholders] OK — no \`${NEEDLE}\` placeholders in ${CATALOG_REL}.`,
    );
    process.exit(0);
  }

  // Diff/CI-friendly: newline-separated `path:line:col` locations.
  const locations = matches.map((m) => `${CATALOG_REL}:${m.line}:${m.col}`).join('\n');

  if (bypass) {
    console.warn(
      `[check-coursera-catalog-placeholders] WARN — found ${count} \`${NEEDLE}\` placeholder(s) in ${CATALOG_REL}.`,
    );
    console.warn(
      `[check-coursera-catalog-placeholders] COURSERA_CATALOG_ALLOW_PLACEHOLDERS is set; treating as advisory (exit 0).`,
    );
    console.warn(locations);
    console.warn(
      `[check-coursera-catalog-placeholders] Resolve by running with B4B credentials:`,
    );
    console.warn(`    node scripts/backfill-coursera-courseids.cjs --write`);
    console.warn(
      `[check-coursera-catalog-placeholders] See ${CATALOG_REL}:1-10 for the full doc-comment.`,
    );
    process.exit(0);
  }

  console.error(
    `[check-coursera-catalog-placeholders] FAIL — found ${count} \`${NEEDLE}\` placeholder(s) in ${CATALOG_REL}.`,
  );
  console.error(
    `[check-coursera-catalog-placeholders] Each placeholder represents a Coursera course whose progress will be SILENTLY DROPPED from the learner dashboard (see lib/coursera/syncUserFromB4B.ts and lib/member/memberProgramTrainingView.ts).`,
  );
  console.error(locations);
  console.error(
    `[check-coursera-catalog-placeholders] Resolve by running with B4B credentials:`,
  );
  console.error(`    node scripts/backfill-coursera-courseids.cjs --write`);
  console.error(
    `[check-coursera-catalog-placeholders] See ${CATALOG_REL}:1-10 for the full doc-comment.`,
  );
  console.error(
    `[check-coursera-catalog-placeholders] To unblock CI temporarily, set env var COURSERA_CATALOG_ALLOW_PLACEHOLDERS=1 (advisory mode).`,
  );
  process.exit(1);
}

main();
