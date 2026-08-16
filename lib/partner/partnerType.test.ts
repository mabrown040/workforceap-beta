import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PARTNER_TYPE,
  isKnownPartnerType,
  isPayoutEligibleType,
  isReferralPartner,
  normalizePartnerType,
  PARTNER_TYPES,
  PAYOUT_ELIGIBLE_TYPES,
} from './partnerType';

test('DEFAULT_PARTNER_TYPE is community — never start in a payout-eligible state', () => {
  assert.equal(DEFAULT_PARTNER_TYPE, 'community');
  assert.equal(PAYOUT_ELIGIBLE_TYPES.has(DEFAULT_PARTNER_TYPE), false);
});

test('PAYOUT_ELIGIBLE_TYPES is a strict subset of PARTNER_TYPES', () => {
  for (const t of PAYOUT_ELIGIBLE_TYPES) {
    assert.ok((PARTNER_TYPES as readonly string[]).includes(t), `${t} is not a declared partner type`);
  }
});

test('isKnownPartnerType accepts only declared values', () => {
  assert.equal(isKnownPartnerType('community'), true);
  assert.equal(isKnownPartnerType('referral'), true);
  assert.equal(isKnownPartnerType('high_school'), true);
  assert.equal(isKnownPartnerType('referral_partner'), false);
  assert.equal(isKnownPartnerType(''), false);
  assert.equal(isKnownPartnerType(null), false);
  assert.equal(isKnownPartnerType(undefined), false);
  assert.equal(isKnownPartnerType(42), false);
});

test('normalizePartnerType falls back to community for malformed / legacy values', () => {
  assert.equal(normalizePartnerType('community'), 'community');
  assert.equal(normalizePartnerType('referral'), 'referral');
  assert.equal(normalizePartnerType('high_school'), 'high_school');
  assert.equal(normalizePartnerType('REFERRAL'), 'community');
  assert.equal(normalizePartnerType(null), 'community');
  assert.equal(normalizePartnerType(undefined), 'community');
  assert.equal(normalizePartnerType(''), 'community');
  assert.equal(normalizePartnerType({}), 'community');
});

test('isReferralPartner returns false for null/undefined/community/unknown partners', () => {
  assert.equal(isReferralPartner(null), false);
  assert.equal(isReferralPartner(undefined), false);
  assert.equal(isReferralPartner({}), false);
  assert.equal(isReferralPartner({ partnerType: null }), false);
  assert.equal(isReferralPartner({ partnerType: 'community' }), false);
  assert.equal(isReferralPartner({ partnerType: 'unknown_value' }), false);
});

test('isReferralPartner returns true only for the referral type', () => {
  assert.equal(isReferralPartner({ partnerType: 'referral' }), true);
});

test('isPayoutEligibleType behaves like the helper for raw values', () => {
  assert.equal(isPayoutEligibleType('referral'), true);
  assert.equal(isPayoutEligibleType('community'), false);
  assert.equal(isPayoutEligibleType(undefined), false);
  assert.equal(isPayoutEligibleType('something_else'), false);
});
