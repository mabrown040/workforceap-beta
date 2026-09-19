import test from 'node:test';
import assert from 'node:assert/strict';
import { stalledCheckInAction, TRIAGE_BUCKET_ACCENTS } from './triageDigestCopy';

test('stalledCheckInAction: unknown day count never renders "?"', () => {
  const copy = stalledCheckInAction('Marcus Bell', null);
  assert.equal(copy, 'Check in with Marcus Bell — no activity in 30+ days');
  assert.ok(!copy.includes('?'));
});

test('stalledCheckInAction: known day count is spelled out', () => {
  assert.equal(stalledCheckInAction('Maria Santos', 42), 'Check in with Maria Santos — stalled 42 days');
  assert.equal(stalledCheckInAction('Priya Kumar', 1), 'Check in with Priya Kumar — stalled 1 day');
});

test('TRIAGE_BUCKET_ACCENTS: new-applicants action copy uses the AA info token, not #3b82f6', () => {
  assert.equal(TRIAGE_BUCKET_ACCENTS['new-applicants'], 'var(--wa-info)');
  for (const accent of Object.values(TRIAGE_BUCKET_ACCENTS)) {
    assert.notEqual(accent.toLowerCase(), '#3b82f6');
  }
  assert.deepEqual(Object.keys(TRIAGE_BUCKET_ACCENTS).sort(), ['at-risk', 'new-applicants', 'stalled']);
});
