import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Portal-uptime guardrail (runs in CI via `npm run test:unit`).
//
// The Prisma client must NEVER resolve auth/GUC context inside the per-query
// hot path. PR #1845 did exactly that (a Supabase auth.getUser() round-trip +
// 2 DB transactions on every prisma.* call) and 504'd every authenticated page
// for all roles for hours on 2026-06-18 (reverted #2048). GUC/auth context must
// be established once per request/render (lib/db/withRequestGuc.ts), never per
// query. This fails the build if the anti-pattern returns to lib/db/prisma.ts.
//
// Logic lives in scripts/verify-no-per-query-guc.cjs (single source of truth;
// also runnable standalone). See docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md.
const require = createRequire(import.meta.url);
const { findViolations, TARGET } = require('../../scripts/verify-no-per-query-guc.cjs');

test(`${TARGET} does not resolve auth/GUC per query (2026-06-18 outage guard)`, () => {
  const violations = findViolations() as string[];
  assert.deepEqual(
    violations,
    [],
    `Per-query auth/GUC resolution detected in the Prisma client — this caused the ` +
      `2026-06-18 portal-wide 504 outage (PR #1845). Resolve context once per ` +
      `request/render (lib/db/withRequestGuc.ts), not per query.\n  ${violations.join('\n  ')}`,
  );
});
