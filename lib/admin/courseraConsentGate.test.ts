import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { courseraApprovalBlockedByConsent } from './courseraConsentGate';

describe('courseraApprovalBlockedByConsent', () => {
  it('blocks a minor without guardian consent', () => {
    assert.equal(
      courseraApprovalBlockedByConsent({ isMinor: true, parentalConsentGiven: false }),
      true,
    );
  });

  it('allows a minor with consent on file', () => {
    assert.equal(
      courseraApprovalBlockedByConsent({ isMinor: true, parentalConsentGiven: true }),
      false,
    );
  });

  it('allows an adult even without a consent flag', () => {
    assert.equal(
      courseraApprovalBlockedByConsent({ isMinor: false, parentalConsentGiven: false }),
      false,
    );
  });

  it('allows a missing profile (legacy adult path)', () => {
    assert.equal(courseraApprovalBlockedByConsent(null), false);
  });
});
