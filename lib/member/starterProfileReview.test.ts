import test from 'node:test';
import assert from 'node:assert/strict';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from './starterProfileReview';

test('starter profile review is skipped for self-serve members', () => {
  const gate = getCounselorStarterProfileReview({
    wasCounselorCreated: false,
    phone: '',
    profilePhone: '',
    profileAddress: '',
    city: '',
    state: '',
    zip: '',
    referralSource: '',
  });

  assert.equal(gate.required, false);
});

test('starter profile review requires missing counselor-seeded fields', () => {
  const gate = getCounselorStarterProfileReview({
    wasCounselorCreated: true,
    phone: '5125551212',
    profilePhone: '5125551212',
    profileAddress: '123 Main St',
    city: 'Austin',
    state: '',
    zip: '',
    referralSource: '',
  });

  assert.equal(gate.required, true);
  assert.deepEqual(gate.missing, ['state', 'zip', 'referralSource']);
  assert.deepEqual(getStarterProfileFieldLabels(gate.missing), ['state', 'ZIP code', 'referral source']);
});

test('starter profile review accepts international postal codes', () => {
  const gate = getCounselorStarterProfileReview({
    wasCounselorCreated: true,
    phone: '2348022167878',
    profilePhone: '2348022167878',
    profileAddress: '12 Allen Avenue',
    city: 'Lagos',
    state: 'Lagos',
    zip: '100001',
    referralSource: 'Friend or family',
  });

  assert.equal(gate.required, false);
});

test('starter profile review clears once counselor-created member finishes cleanup', () => {
  const gate = getCounselorStarterProfileReview({
    wasCounselorCreated: true,
    phone: '512-555-1212',
    profileAddress: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    referralSource: 'Google Search',
  });

  assert.equal(gate.required, false);
});
