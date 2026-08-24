import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaffMfaEnforcementEnabled } from './mfaConfig';

function withEnv(vars: { STAFF_MFA_ENFORCEMENT?: string; VERCEL_ENV?: string }, fn: () => void) {
  const prevFlag = process.env.STAFF_MFA_ENFORCEMENT;
  const prevVercel = process.env.VERCEL_ENV;
  try {
    if (vars.STAFF_MFA_ENFORCEMENT === undefined) delete process.env.STAFF_MFA_ENFORCEMENT;
    else process.env.STAFF_MFA_ENFORCEMENT = vars.STAFF_MFA_ENFORCEMENT;

    if (vars.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = vars.VERCEL_ENV;

    fn();
  } finally {
    if (prevFlag === undefined) delete process.env.STAFF_MFA_ENFORCEMENT;
    else process.env.STAFF_MFA_ENFORCEMENT = prevFlag;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
}

test('staff MFA stays opt-in outside Vercel production (staged rollout)', () => {
  withEnv({ VERCEL_ENV: undefined, STAFF_MFA_ENFORCEMENT: undefined }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'preview', STAFF_MFA_ENFORCEMENT: undefined }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'preview', STAFF_MFA_ENFORCEMENT: '0' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
  withEnv({ VERCEL_ENV: undefined, STAFF_MFA_ENFORCEMENT: '1' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), true);
  });
});

test('staff MFA fails closed in VERCEL_ENV=production unless explicitly disabled', () => {
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: undefined }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), true);
  });
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: '' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), true);
  });
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: '1' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), true);
  });
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: '0' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: 'false' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
  withEnv({ VERCEL_ENV: 'production', STAFF_MFA_ENFORCEMENT: 'off' }, () => {
    assert.equal(isStaffMfaEnforcementEnabled(), false);
  });
});
