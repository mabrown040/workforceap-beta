import test from 'node:test';
import assert from 'node:assert/strict';
import { isFirstDayMember } from '../../lib/member/isFirstDayMember.js';

test('isFirstDayMember returns true within 24 hours of signup', () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  assert.equal(isFirstDayMember(twoHoursAgo), true);
});

test('isFirstDayMember returns false after 24 hours', () => {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  assert.equal(isFirstDayMember(twoDaysAgo), false);
});

test('isFirstDayMember returns false for missing createdAt', () => {
  assert.equal(isFirstDayMember(null), false);
  assert.equal(isFirstDayMember(undefined), false);
});
