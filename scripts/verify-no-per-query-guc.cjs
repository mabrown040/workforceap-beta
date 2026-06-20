#!/usr/bin/env node
/**
 * CI guardrail: the Prisma client (lib/db/prisma.ts) must NEVER resolve auth /
 * GUC context inside the per-query hot path.
 *
 * Incident 2026-06-18: PR #1845 added lazy per-query GUC resolution to the
 * Prisma middleware — `const { resolveAuthGucContext } = await import('../auth/server');
 * ctx = await resolveAuthGucContext();` — which did a Supabase `auth.getUser()`
 * network round-trip + 2 DB transactions on EVERY `prisma.*` call. RSC page
 * renders run outside the GUC AsyncLocalStorage scope, so it fired per query →
 * /admin's 8+ queries blew past the 60s function timeout → 504 on every
 * authenticated page, all roles, for hours. Reverted in #2048.
 *
 * GUC/auth context must be established ONCE per request/render (see
 * lib/db/withRequestGuc.ts), never lazily per query. This guard fails if the
 * anti-pattern returns. See docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md.
 *
 * Run directly (node scripts/verify-no-per-query-guc.cjs) or via the co-located
 * unit test lib/db/prisma.no-per-query-guc.test.ts (so it runs in `npm run test:unit`).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = 'lib/db/prisma.ts';

/** Strip // line comments and block comments so a documenting mention does not trip the guard. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const FORBIDDEN = [
  {
    re: /resolveAuthGucContext/,
    why: 'calls resolveAuthGucContext() — a Supabase auth round-trip + DB transactions — from the Prisma query path',
  },
  {
    re: /\bimport\s*\(\s*[`'"][^`'"]*auth\/server[^`'"]*[`'"]\s*\)/,
    why: 'dynamically imports auth/server inside the Prisma client (lazy per-query auth resolution — the #1845 smell)',
  },
  {
    re: /\bawait\s+(?:getUser|resolveAuth|auth)\s*\(/,
    why: 'awaits an auth resolver inside the Prisma client hot path',
  },
];

/** @returns {string[]} list of violations (empty = clean) */
function findViolations() {
  const code = stripComments(fs.readFileSync(path.join(ROOT, TARGET), 'utf8'));
  return FORBIDDEN.filter(({ re }) => re.test(code)).map(({ why }) => `${TARGET} ${why}.`);
}

module.exports = { findViolations, TARGET };

if (require.main === module) {
  const violations = findViolations();
  if (violations.length > 0) {
    console.error(`\n[verify-no-per-query-guc] FAIL:`);
    for (const v of violations) console.error(`  - ${v}`);
    console.error(
      '\n[verify-no-per-query-guc] Resolve GUC/auth context ONCE per request/render ' +
        '(lib/db/withRequestGuc.ts), never per query inside the Prisma client. ' +
        'This anti-pattern caused the 2026-06-18 portal-wide 504 outage (PR #1845, reverted #2048).',
    );
    process.exit(1);
  }
  console.log(`[verify-no-per-query-guc] OK — ${TARGET} does not resolve auth/GUC per query.`);
}
