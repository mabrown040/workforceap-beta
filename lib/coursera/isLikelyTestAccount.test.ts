import test from 'node:test';
import assert from 'node:assert/strict';
import { isLikelyTestAccount } from './testAccountHeuristic';

// ─── Confirmed test patterns ────────────────────────────────────────────────

test('isLikelyTestAccount: matches "test" substring', () => {
  assert.equal(isLikelyTestAccount('test@workforceap.org'), true);
  assert.equal(isLikelyTestAccount('test-smoke@workforceap.org'), true);
  assert.equal(isLikelyTestAccount('qa-test@example.org'), true);
  assert.equal(isLikelyTestAccount('e2e.test@gmail.com'), true);
  assert.equal(isLikelyTestAccount('preflight-test-1@workforceap.org'), true);
});

test('isLikelyTestAccount: matches "force-" prefix (load-test convention)', () => {
  assert.equal(isLikelyTestAccount('force-test-1778028412@workforceap.org'), true);
  assert.equal(isLikelyTestAccount('force-canary@workforceap.org'), true);
  assert.equal(isLikelyTestAccount('force-load@example.com'), true);
});

test('isLikelyTestAccount: matches "noreply" / "no-reply" prefix', () => {
  assert.equal(isLikelyTestAccount('noreply@workforceap.org'), true);
  assert.equal(isLikelyTestAccount('noreply-bounce@example.com'), true);
  assert.equal(isLikelyTestAccount('no-reply@github.com'), true);
});

test('isLikelyTestAccount: matches @example.com / @example.org (RFC 2606 reserved)', () => {
  assert.equal(isLikelyTestAccount('admin@example.com'), true);
  assert.equal(isLikelyTestAccount('user@example.org'), true);
  assert.equal(isLikelyTestAccount('whatever@EXAMPLE.COM'), true); // case insensitive
});

// ─── Real-applicant emails should NOT match ─────────────────────────────────

test('isLikelyTestAccount: real applicant emails not flagged', () => {
  assert.equal(isLikelyTestAccount('drew.l.harris14@gmail.com'), false);
  assert.equal(isLikelyTestAccount('noel2764@gmail.com'), false);
  assert.equal(isLikelyTestAccount('maria.gonzalez@yahoo.com'), false);
  assert.equal(isLikelyTestAccount('t.brown@workforceap.org'), false);
  assert.equal(isLikelyTestAccount('michael.brown2@workforceap.org'), false);
  assert.equal(isLikelyTestAccount('peacemycommunitybacktogether@gmail.com'), false);
  assert.equal(isLikelyTestAccount('tarrancehopkins98@gmail.com'), false);
});

test('isLikelyTestAccount: known false-positive risk on names containing "test"', () => {
  // Documented: substring 'test' will catch these. Real applicants almost
  // never have this pattern — if a real one appears, allowlist them via the
  // ?showTest=1 toggle and add an explicit exemption later.
  assert.equal(isLikelyTestAccount('kontestina@gmail.com'), true);
  assert.equal(isLikelyTestAccount('protester@example.com'), true); // also matches @example.com
});

test('isLikelyTestAccount: actor-identifiers (no @) are evaluated as plain strings', () => {
  // Some xAPI events arrive as actor.account.name (no mbox). Those flow
  // through the same predicate. If a Coursera-internal account name happens
  // to start with 'test-' it would (correctly) be flagged.
  assert.equal(isLikelyTestAccount('test-account-12345'), true);
  assert.equal(isLikelyTestAccount('force-load-actor'), true);
  assert.equal(isLikelyTestAccount('coursera-real-user-id-12345'), false);
  assert.equal(isLikelyTestAccount('mbox-67ab8c'), false);
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

test('isLikelyTestAccount: handles null / undefined / empty', () => {
  assert.equal(isLikelyTestAccount(null), false);
  assert.equal(isLikelyTestAccount(undefined), false);
  assert.equal(isLikelyTestAccount(''), false);
  assert.equal(isLikelyTestAccount('   '), false);
});

test('isLikelyTestAccount: trims whitespace before evaluating', () => {
  assert.equal(isLikelyTestAccount('  test@workforceap.org  '), true);
  assert.equal(isLikelyTestAccount('\ttest-smoke@example.com\n'), true);
});

test('isLikelyTestAccount: case-insensitive across all patterns', () => {
  assert.equal(isLikelyTestAccount('TEST@WORKFORCEAP.ORG'), true);
  assert.equal(isLikelyTestAccount('FORCE-TEST@example.com'), true);
  assert.equal(isLikelyTestAccount('NoReply@gmail.com'), true);
  assert.equal(isLikelyTestAccount('admin@Example.Com'), true);
});

// ─── Invariants the SQL HAVING clause must match ────────────────────────────
//
// The SQL filter in TEST_ACCOUNT_EXCLUSION_HAVING uses these LIKE patterns:
//   email LIKE '%test%'
//   email LIKE 'force-%'
//   email LIKE 'noreply%'
//   email LIKE 'no-reply%'
//   email LIKE '%@example.com'
//   email LIKE '%@example.org'
//
// These tests document the parity. If the JS predicate and the SQL fragment
// drift, this whole filter becomes inconsistent. Keep them synced.

test('isLikelyTestAccount: SQL parity — LIKE %test% matches anywhere', () => {
  assert.equal(isLikelyTestAccount('a-test-b@gmail.com'), true);
  assert.equal(isLikelyTestAccount('xtestx'), true);
});

test('isLikelyTestAccount: SQL parity — LIKE force-% requires prefix', () => {
  // 'reinforced' ends with 'force' but doesn't start with 'force-' — and
  // doesn't contain 'test', so should NOT match. (Real risk: 'forcement'
  // could exist as a name; substring match would not fire since 'force-'
  // requires the dash.)
  assert.equal(isLikelyTestAccount('reinforced@gmail.com'), false);
  assert.equal(isLikelyTestAccount('force@gmail.com'), false); // no dash
  assert.equal(isLikelyTestAccount('force-x@gmail.com'), true);
});

test('isLikelyTestAccount: SQL parity — LIKE noreply% requires prefix', () => {
  // 'announce-noreply' contains noreply but doesn't start with it.
  assert.equal(isLikelyTestAccount('announce-noreply@gmail.com'), false);
  assert.equal(isLikelyTestAccount('noreply-x@gmail.com'), true);
});
