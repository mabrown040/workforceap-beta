import test from 'node:test';
import assert from 'node:assert/strict';

import { utcDateKey } from './dailyStudyPoints';

test('utcDateKey formats a UTC calendar day as YYYY-MM-DD', () => {
  assert.equal(utcDateKey(new Date('2026-07-03T00:00:00.000Z')), '2026-07-03');
  assert.equal(utcDateKey(new Date('2026-07-03T23:59:59.999Z')), '2026-07-03');
});

test('utcDateKey pads single-digit month/day', () => {
  assert.equal(utcDateKey(new Date('2026-01-05T12:00:00.000Z')), '2026-01-05');
});

test('utcDateKey is the same key for two statements on the same UTC day regardless of time', () => {
  const morning = utcDateKey(new Date('2026-07-03T01:00:00.000Z'));
  const night = utcDateKey(new Date('2026-07-03T22:45:00.000Z'));
  assert.equal(morning, night);
});

test('utcDateKey differs across a UTC day boundary — this is what makes the once-per-day cap advance', () => {
  const day1 = utcDateKey(new Date('2026-07-03T23:59:59.000Z'));
  const day2 = utcDateKey(new Date('2026-07-04T00:00:01.000Z'));
  assert.notEqual(day1, day2);
});
