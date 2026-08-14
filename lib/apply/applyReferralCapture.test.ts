/**
 * Tests for apply referral capture.
 * The referral code is read from ?ref= query param and stored in session + cookie.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { APPLY_REFERRAL_SESSION_KEY } from './applyReferralCapture';
import { APPLY_REFERRAL_COOKIE } from '@/lib/partner/sponsoredEnrollment';

describe('applyReferralCapture constants', () => {
  it('exports APPLY_REFERRAL_SESSION_KEY', () => {
    assert.equal(typeof APPLY_REFERRAL_SESSION_KEY, 'string');
    assert.ok(APPLY_REFERRAL_SESSION_KEY.length > 0, 'session key should not be empty');
  });

  it('session key is a stable string (not dynamic)', () => {
    // Importing twice should give same value — no randomness
    const { APPLY_REFERRAL_SESSION_KEY: key2 } = require('./applyReferralCapture');
    assert.equal(APPLY_REFERRAL_SESSION_KEY, key2);
  });

  it('shares the cookie name with the sponsorship helper', () => {
    assert.equal(APPLY_REFERRAL_COOKIE, 'wap_partner_ref');
  });
});
