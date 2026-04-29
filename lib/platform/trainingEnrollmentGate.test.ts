import test from 'node:test';
import assert from 'node:assert/strict';
import { isMemberWioaVerified } from './trainingEnrollmentGate';

test('returns ok when wioaReviewStatus is verified', () => {
  const result = isMemberWioaVerified({ wioaReviewStatus: 'verified' });
  assert.deepEqual(result, { ok: true });
});

test('returns WIOA_NOT_STARTED when status is null', () => {
  const result = isMemberWioaVerified({ wioaReviewStatus: null });
  assert.deepEqual(result, { ok: false, code: 'WIOA_NOT_STARTED' });
});

test('returns WIOA_PENDING when status is pending', () => {
  const result = isMemberWioaVerified({ wioaReviewStatus: 'pending' });
  assert.deepEqual(result, { ok: false, code: 'WIOA_PENDING' });
});

test('returns WIOA_NOT_ELIGIBLE when status is not_eligible', () => {
  const result = isMemberWioaVerified({ wioaReviewStatus: 'not_eligible' });
  assert.deepEqual(result, { ok: false, code: 'WIOA_NOT_ELIGIBLE' });
});

test('admin bypass: returns ok when enrolledByAdminId is set regardless of WIOA status', () => {
  const result = isMemberWioaVerified({ wioaReviewStatus: null, enrolledByAdminId: 'admin-123' });
  assert.deepEqual(result, { ok: true });
});
