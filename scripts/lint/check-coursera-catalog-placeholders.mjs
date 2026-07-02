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
const LP_MAPPING_REL = 'lib/content/coursera/lp_mapping.json';
const LP_MAPPING_ABS = resolve(REPO_ROOT, LP_MAPPING_REL);
const NEEDLE = 'TODO_courseId_';

// Real Coursera course ids are 22-char base64url. The 2026-07-02 audit found
// ~90 fabricated ids (sequential patterns, many 21 chars) had replaced
// placeholders — plausible enough to pass the TODO_ check while silently
// breaking enrollment POSTs and xAPI course matching. Two structural checks
// stop that from recurring:
//   1. every courseId must be exactly 22 base64url chars;
//   2. when a program's learningPathId exists in lp_mapping.json (the
//      authoritative Learning Path dump), every courseId must appear in that
//      Learning Path.
const COURSE_ID_RE = /^[A-Za-z0-9_-]{22}$/;

function validateCatalogIntegrity(source, lines) {
  const problems = [];

  let lpByPath = {};
  try {
    lpByPath = JSON.parse(readFileSync(LP_MAPPING_ABS, 'utf8'));
  } catch (err) {
    problems.push(`could not read ${LP_MAPPING_REL}: ${err.message} (LP-membership check skipped)`);
  }

  // Walk the file tracking the current program block + its learningPathId so
  // courseId findings can be attributed and checked against the right LP.
  let currentProgram = null;
  let currentLpIds = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const blockStart = line.match(/^  "([^"]+)": \{/);
    if (blockStart) {
      currentProgram = blockStart[1];
      currentLpIds = null;
    }
    const lpMatch = line.match(/learningPathId: "([^"]+)"/);
    if (lpMatch && currentProgram) {
      const lpEntry = lpByPath[lpMatch[1]];
      currentLpIds = lpEntry ? new Set(lpEntry.courses.map((c) => c.coursera_id)) : null;
    }
    const idMatch = line.match(/courseId: "([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (id.startsWith('TODO_')) continue; // handled by the placeholder check
    if (!COURSE_ID_RE.test(id)) {
      problems.push(`${CATALOG_REL}:${i + 1} courseId "${id}" is not a 22-char base64url Coursera id (program "${currentProgram}")`);
    } else if (currentLpIds && !currentLpIds.has(id)) {
      problems.push(`${CATALOG_REL}:${i + 1} courseId "${id}" is not in the ${LP_MAPPING_REL} Learning Path for program "${currentProgram}"`);
    }
  }
  return problems;
}

/**
 * Known count of `TODO_courseId_` substring matches at the time this
 * guard was introduced. Includes 2 occurrences in the file's doc-comment
 * header (lines 1 and 8) explaining the placeholder system.
 *
 * The guard fails when count > BASELINE — its whole purpose is to stop
 * NEW placeholders from creeping in. Decrease this number as the
 * backfill script resolves placeholders (down to 2 — the doc-comment
 * floor). Don't increase it just to silence the check; if a new
 * placeholder is being added intentionally, run the backfill script
 * instead.
 */
const BASELINE_COUNT = 0;

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

  const integrityProblems = validateCatalogIntegrity(source, lines);
  if (integrityProblems.length > 0) {
    console.error(
      `[check-coursera-catalog-placeholders] FAIL — ${integrityProblems.length} catalog integrity problem(s):`,
    );
    for (const p of integrityProblems) console.error(`  ${p}`);
    console.error(
      `[check-coursera-catalog-placeholders] courseIds must be real Coursera ids. Regenerate from ${LP_MAPPING_REL} or run \`node scripts/backfill-coursera-courseids.cjs --write\` with B4B credentials — never hand-write ids.`,
    );
    process.exit(1);
  }

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

  // Diff/CI-friendly: newline-separated `path:line:col` locations.
  const locations = matches.map((m) => `${CATALOG_REL}:${m.line}:${m.col}`).join('\n');

  if (count === 0) {
    console.log(
      `[check-coursera-catalog-placeholders] OK — no \`${NEEDLE}\` placeholders in ${CATALOG_REL}. Consider lowering BASELINE_COUNT to 0 in this script.`,
    );
    process.exit(0);
  }

  if (count < BASELINE_COUNT) {
    console.log(
      `[check-coursera-catalog-placeholders] OK — count dropped from baseline ${BASELINE_COUNT} to ${count}. Update BASELINE_COUNT in this script to lock in the improvement.`,
    );
    process.exit(0);
  }

  if (count === BASELINE_COUNT) {
    console.log(
      `[check-coursera-catalog-placeholders] OK — at baseline ${BASELINE_COUNT}. No new \`${NEEDLE}\` placeholders. Run \`scripts/backfill-coursera-courseids.cjs --write\` with B4B credentials to start resolving them.`,
    );
    process.exit(0);
  }

  // count > BASELINE_COUNT — at least one NEW placeholder was added.
  if (bypass) {
    console.warn(
      `[check-coursera-catalog-placeholders] WARN — count is ${count} (baseline ${BASELINE_COUNT}, ${count - BASELINE_COUNT} new). COURSERA_CATALOG_ALLOW_PLACEHOLDERS is set; treating as advisory.`,
    );
    console.warn(locations);
    process.exit(0);
  }

  console.error(
    `[check-coursera-catalog-placeholders] FAIL — count is ${count}, baseline is ${BASELINE_COUNT}. ${count - BASELINE_COUNT} NEW \`${NEEDLE}\` placeholder(s) added.`,
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
    `[check-coursera-catalog-placeholders] To unblock CI temporarily, set COURSERA_CATALOG_ALLOW_PLACEHOLDERS=1 (advisory mode), but the right fix is to NOT add the placeholder.`,
  );
  process.exit(1);
}

main();
