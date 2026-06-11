import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckInsByStage,
  daysSincePlacement,
  getFirst90Stage,
  isFirst90Response,
  isFirst90Stage,
} from '@/lib/member/first90Days';

const placedAt = new Date('2026-01-01T12:00:00Z');

function daysLater(n: number): Date {
  return new Date(placedAt.getTime() + n * 24 * 60 * 60 * 1000);
}

test('daysSincePlacement: 0 on placement day, whole days after, negative before', () => {
  assert.equal(daysSincePlacement(placedAt, placedAt), 0);
  assert.equal(daysSincePlacement(placedAt, daysLater(30)), 30);
  assert.equal(daysSincePlacement(placedAt, daysLater(-2)), -2);
});

test('getFirst90Stage: week_1 covers days 0-13', () => {
  assert.equal(getFirst90Stage(placedAt, daysLater(0)), 'week_1');
  assert.equal(getFirst90Stage(placedAt, daysLater(13)), 'week_1');
});

test('getFirst90Stage: day_30 covers days 14-44', () => {
  assert.equal(getFirst90Stage(placedAt, daysLater(14)), 'day_30');
  assert.equal(getFirst90Stage(placedAt, daysLater(44)), 'day_30');
});

test('getFirst90Stage: day_60 covers days 45-74', () => {
  assert.equal(getFirst90Stage(placedAt, daysLater(45)), 'day_60');
  assert.equal(getFirst90Stage(placedAt, daysLater(74)), 'day_60');
});

test('getFirst90Stage: day_90 covers day 75 through the grace window', () => {
  assert.equal(getFirst90Stage(placedAt, daysLater(75)), 'day_90');
  assert.equal(getFirst90Stage(placedAt, daysLater(90)), 'day_90');
  assert.equal(getFirst90Stage(placedAt, daysLater(104)), 'day_90');
});

test('getFirst90Stage: null outside the window', () => {
  assert.equal(getFirst90Stage(placedAt, daysLater(105)), null);
  assert.equal(getFirst90Stage(placedAt, daysLater(-1)), null);
});

test('type guards accept known stages and responses only', () => {
  assert.equal(isFirst90Stage('week_1'), true);
  assert.equal(isFirst90Stage('day_45'), false);
  assert.equal(isFirst90Response('having_trouble'), true);
  assert.equal(isFirst90Response('meh'), false);
});

test('buildCheckInsByStage keeps newest response per stage, skips malformed rows', () => {
  const byStage = buildCheckInsByStage([
    { entityId: 'week_1', metadata: { response: 'going_well' }, createdAt: daysLater(5) },
    { entityId: 'week_1', metadata: { response: 'having_trouble' }, createdAt: daysLater(2) },
    { entityId: 'day_30', metadata: { response: 'nonsense' }, createdAt: daysLater(20) },
    { entityId: null, metadata: { response: 'going_well' }, createdAt: daysLater(21) },
    { entityId: 'unknown_stage', metadata: { response: 'going_well' }, createdAt: daysLater(22) },
  ]);
  assert.equal(byStage.week_1?.response, 'going_well');
  assert.equal(byStage.day_30, undefined);
});
