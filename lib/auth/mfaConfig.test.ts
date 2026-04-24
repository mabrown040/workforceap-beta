import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaffMfaEnforcementEnabled } from './mfaConfig';

test('staff MFA enforcement is disabled unless explicitly enabled', () => {
  const previous = process.env.STAFF_MFA_ENFORCEMENT;
  try {
    delete process.env.STAFF_MFA_ENFORCEMENT;
    assert.equal(isStaffMfaEnforcementEnabled(), false);

    process.env.STAFF_MFA_ENFORCEMENT = '0';
    assert.equal(isStaffMfaEnforcementEnabled(), false);

    process.env.STAFF_MFA_ENFORCEMENT = '1';
    assert.equal(isStaffMfaEnforcementEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env.STAFF_MFA_ENFORCEMENT;
    else process.env.STAFF_MFA_ENFORCEMENT = previous;
  }
});
