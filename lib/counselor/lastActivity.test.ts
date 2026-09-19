import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeInactivity,
  isUrgentInactivity,
  resolveMemberLastActivity,
  NO_ACTIVITY_RECORDED_LABEL,
} from './lastActivity';

const NOW = new Date('2026-09-19T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

test('resolveMemberLastActivity: no events → null recency, never a fallback date', () => {
  assert.deepEqual(resolveMemberLastActivity(null, NOW), { lastActivityAt: null, daysInactive: null });
  assert.deepEqual(resolveMemberLastActivity(undefined, NOW), { lastActivityAt: null, daysInactive: null });
});

test('resolveMemberLastActivity: whole days since the last event, no floor', () => {
  const last = new Date(NOW.getTime() - 3 * DAY - 5 * 60 * 60 * 1000);
  assert.deepEqual(resolveMemberLastActivity(last, NOW), { lastActivityAt: last, daysInactive: 3 });
  const today = new Date(NOW.getTime() - 4 * 60 * 60 * 1000);
  assert.equal(resolveMemberLastActivity(today, NOW).daysInactive, 0);
});

test('resolveMemberLastActivity: clock skew (event in the future) clamps to 0 days', () => {
  const future = new Date(NOW.getTime() + DAY);
  assert.equal(resolveMemberLastActivity(future, NOW).daysInactive, 0);
});

test('describeInactivity: says "No activity recorded" instead of inventing a number', () => {
  assert.equal(describeInactivity(null), NO_ACTIVITY_RECORDED_LABEL);
  assert.equal(describeInactivity(1), '1 day inactive');
  assert.equal(describeInactivity(12), '12 days inactive');
});

test('isUrgentInactivity: unknown recency is never urgent', () => {
  assert.equal(isUrgentInactivity(null, 14), false);
  assert.equal(isUrgentInactivity(13, 14), false);
  assert.equal(isUrgentInactivity(14, 14), true);
});
