import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDocMissing,
  isApplicationStalled,
  isAtRiskFlag,
  isLastContactOverdue,
  pickPrimaryInboxFlag,
  sortInboxRows,
  inboxRowSeverity,
  DOC_MISSING_DAYS,
  APPLICATION_STALLED_DAYS,
  LAST_CONTACT_DAYS,
  type InboxZeroRow,
} from './inboxZero';

const NOW = new Date('2026-05-07T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

test('isDocMissing: false when resume exists', () => {
  const assigned = new Date(NOW.getTime() - 10 * DAY);
  assert.equal(isDocMissing(true, assigned, NOW), false);
});

test(`isDocMissing: false within ${DOC_MISSING_DAYS} days of assignment`, () => {
  const assigned = new Date(NOW.getTime() - DOC_MISSING_DAYS * DAY);
  assert.equal(isDocMissing(false, assigned, NOW), false);
});

test(`isDocMissing: true after ${DOC_MISSING_DAYS} days without resume`, () => {
  const assigned = new Date(NOW.getTime() - (DOC_MISSING_DAYS + 1) * DAY);
  assert.equal(isDocMissing(false, assigned, NOW), true);
});

test(`isApplicationStalled: true for PENDING older than ${APPLICATION_STALLED_DAYS}d`, () => {
  const at = new Date(NOW.getTime() - (APPLICATION_STALLED_DAYS + 1) * DAY);
  assert.equal(isApplicationStalled(at, 'PENDING', NOW), true);
});

test('isApplicationStalled: false for APPROVED', () => {
  const at = new Date(NOW.getTime() - 30 * DAY);
  assert.equal(isApplicationStalled(at, 'APPROVED', NOW), false);
});

test('isAtRiskFlag: true when open alert score present', () => {
  assert.equal(isAtRiskFlag(45), true);
  assert.equal(isAtRiskFlag(null), false);
});

test(`isLastContactOverdue: true when no counselor message in ${LAST_CONTACT_DAYS}+ days`, () => {
  const last = new Date(NOW.getTime() - (LAST_CONTACT_DAYS + 1) * DAY);
  assert.equal(isLastContactOverdue(last, NOW), true);
  assert.equal(isLastContactOverdue(null, NOW), true);
});

test('pickPrimaryInboxFlag: at_risk wins over doc_missing', () => {
  const picked = pickPrimaryInboxFlag(['doc_missing', 'at_risk', 'last_contact']);
  assert.equal(picked?.primary, 'at_risk');
  assert.deepEqual(picked?.additional, ['doc_missing', 'last_contact']);
});

test('sortInboxRows: priority rank then severity', () => {
  const rows: InboxZeroRow[] = [
    {
      memberId: 'a',
      memberName: 'Alice',
      memberEmail: 'a@test.com',
      enrolledProgram: null,
      primaryFlag: 'last_contact',
      additionalFlags: [],
      priorityRank: 3,
      severity: 10,
      context: {},
    },
    {
      memberId: 'b',
      memberName: 'Bob',
      memberEmail: 'b@test.com',
      enrolledProgram: null,
      primaryFlag: 'at_risk',
      additionalFlags: [],
      priorityRank: 0,
      severity: 80,
      context: { atRiskScore: 80 },
    },
  ];
  const sorted = sortInboxRows(rows);
  assert.equal(sorted[0].memberId, 'b');
  assert.equal(inboxRowSeverity('at_risk', { atRiskScore: 72 }), 72);
});
