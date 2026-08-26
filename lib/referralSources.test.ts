import test from 'node:test';
import assert from 'node:assert/strict';
import { CENTRAL_TEXAS_REFERRAL_SOURCES, PUBLIC_REFERRAL_SOURCE_OPTIONS } from './referralSources';

test('hear-about list leads with named partners from the 8/24 adjustments', () => {
  assert.equal(CENTRAL_TEXAS_REFERRAL_SOURCES[0], 'Launch Pad Job Club');
  assert.equal(CENTRAL_TEXAS_REFERRAL_SOURCES[1], 'Purpose Works / Job Seekers Network');
  assert.ok(PUBLIC_REFERRAL_SOURCE_OPTIONS.includes('Workforce Solutions Capital Area'));
  assert.ok(PUBLIC_REFERRAL_SOURCE_OPTIONS.includes('Workforce Solutions Rural Capital Area'));
  assert.equal(CENTRAL_TEXAS_REFERRAL_SOURCES.at(-1), 'Other / write in');
});
