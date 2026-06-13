/**
 * Tests for member-to-member referral logic (pure, DB-free surface).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  referralRewardEligibility,
  isValidReferralCode,
  normalizeReferralCode,
  MEMBER_REFERRAL_COOKIE,
} from './referralRules';
import { POINT_VALUES, EVENT_LABELS } from './pointsConfig';

describe('referralRewardEligibility', () => {
  it('rewards a valid, first-time, non-self referral', () => {
    const r = referralRewardEligibility({ referrerUserId: 'a', refereeUserId: 'b', alreadyReferred: false });
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'eligible');
  });

  it('rejects an unknown code (no referrer resolved)', () => {
    const r = referralRewardEligibility({ referrerUserId: null, refereeUserId: 'b', alreadyReferred: false });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'unknown_code');
  });

  it('rejects self-referral', () => {
    const r = referralRewardEligibility({ referrerUserId: 'a', refereeUserId: 'a', alreadyReferred: false });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'self_referral');
  });

  it('rejects a referee who was already referred (anti-farming)', () => {
    const r = referralRewardEligibility({ referrerUserId: 'a', refereeUserId: 'b', alreadyReferred: true });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'already_referred');
  });
});

describe('referral code validation', () => {
  it('normalizes case, whitespace, and length', () => {
    assert.equal(normalizeReferralCode('  abc123  '), 'ABC123');
    assert.equal(normalizeReferralCode(null), '');
    assert.equal(normalizeReferralCode('x'.repeat(40)).length, 16);
  });

  it('accepts well-formed codes and rejects junk', () => {
    assert.equal(isValidReferralCode('ABCD2345'), true);
    assert.equal(isValidReferralCode('ab'), false); // too short
    assert.equal(isValidReferralCode('bad-code!'), false); // illegal chars
    assert.equal(isValidReferralCode(''), false);
  });
});

describe('referral points wiring', () => {
  it('defines both reward events with positive values', () => {
    assert.ok(POINT_VALUES.referral_referrer_reward > 0);
    assert.ok(POINT_VALUES.referral_referee_reward > 0);
  });

  it('labels both reward events', () => {
    assert.ok(EVENT_LABELS.referral_referrer_reward);
    assert.ok(EVENT_LABELS.referral_referee_reward);
  });

  it('exposes a stable cookie name', () => {
    assert.equal(MEMBER_REFERRAL_COOKIE, 'wap_mref');
  });
});
