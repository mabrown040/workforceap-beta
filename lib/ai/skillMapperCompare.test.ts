import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeSkillGaps,
  hasComparableSkills,
  type SkillRadarPoint,
} from './skillMapperCompare';

const MEMBER: SkillRadarPoint[] = [
  { axis: 'Analytics', value: 0.4 },
  { axis: 'Engineering', value: 0.3 },
  { axis: 'Design', value: 0.8 },
];

const TARGET: SkillRadarPoint[] = [
  { axis: 'Analytics', value: 0.8 },
  { axis: 'Engineering', value: 0.9 },
  { axis: 'Design', value: 0.4 },
  { axis: 'Strategy', value: 0.5 },
];

test('hasComparableSkills is false for empty or all-zero profiles', () => {
  assert.equal(hasComparableSkills([]), false);
  assert.equal(hasComparableSkills([{ axis: 'Analytics', value: 0 }]), false);
});

test('hasComparableSkills is true when any axis has signal', () => {
  assert.equal(hasComparableSkills(MEMBER), true);
});

test('computeSkillGaps returns empty when either side is missing', () => {
  assert.deepEqual(computeSkillGaps([], TARGET), []);
  assert.deepEqual(computeSkillGaps(MEMBER, []), []);
});

test('computeSkillGaps keeps only axes the occupation needs more of', () => {
  const gaps = computeSkillGaps(MEMBER, TARGET);
  assert.deepEqual(
    gaps.map((row) => row.axis),
    ['Engineering', 'Strategy', 'Analytics'],
  );
  assert.ok(!gaps.some((row) => row.axis === 'Design'), 'Design is a strength, not a gap');
});

test('computeSkillGaps scales 0–1 radar values to 0–100 display percentages', () => {
  const engineering = computeSkillGaps(MEMBER, TARGET).find((row) => row.axis === 'Engineering');
  assert.ok(engineering);
  assert.equal(engineering.member, 30);
  assert.equal(engineering.target, 90);
  assert.equal(engineering.gap, 60);
});

test('computeSkillGaps treats a missing member axis as zero', () => {
  const strategy = computeSkillGaps(MEMBER, TARGET).find((row) => row.axis === 'Strategy');
  assert.ok(strategy);
  assert.equal(strategy.member, 0);
  assert.equal(strategy.target, 50);
  assert.equal(strategy.gap, 50);
});

test('computeSkillGaps sorts the largest shortfall first', () => {
  const gaps = computeSkillGaps(MEMBER, TARGET);
  const deltas = gaps.map((row) => row.gap);
  assert.deepEqual(deltas, [...deltas].sort((a, b) => b - a));
});
