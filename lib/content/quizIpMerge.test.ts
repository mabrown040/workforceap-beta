import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MINI_IP_MAX_PER_DIMENSION,
  riasecFromResultRows,
  riasecToRadarAxes,
  type InterestProfilerRiasec,
} from './quizIpMerge';

function axisValue(axes: ReturnType<typeof riasecToRadarAxes>, name: string): number {
  const found = axes.find((a) => a.axis === name);
  if (!found) throw new Error(`axis ${name} missing`);
  return found.value;
}

test('riasecFromResultRows parses lowercase codes from O*NET payload', () => {
  const rows = [
    { code: 'Realistic', score: 8 },
    { code: 'Investigative', score: 10 },
    { code: 'Artistic', score: 3 },
    { code: 'Social', score: 11 },
    { code: 'Enterprising', score: 14 },
    { code: 'Conventional', score: 6 },
  ];
  const parsed = riasecFromResultRows(rows);
  assert.deepEqual(parsed, {
    realistic: 8,
    investigative: 10,
    artistic: 3,
    social: 11,
    enterprising: 14,
    conventional: 6,
  });
});

test('riasecFromResultRows returns null when every score is zero', () => {
  const parsed = riasecFromResultRows([
    { code: 'realistic', score: 0 },
    { code: 'investigative', score: 0 },
    { code: 'artistic', score: 0 },
    { code: 'social', score: 0 },
    { code: 'enterprising', score: 0 },
    { code: 'conventional', score: 0 },
  ]);
  assert.equal(parsed, null);
});

test('riasecToRadarAxes returns all six radar axes in stable order', () => {
  const zero: InterestProfilerRiasec = {
    realistic: 0, investigative: 0, artistic: 0,
    social: 0, enterprising: 0, conventional: 0,
  };
  const axes = riasecToRadarAxes(zero);
  assert.deepEqual(
    axes.map((a) => a.axis),
    ['Analytics', 'Engineering', 'Design', 'Strategy', 'Service', 'Research'],
  );
  for (const a of axes) assert.equal(a.value, 0);
});

test('riasecToRadarAxes uses absolute normalization — high E maxes Strategy axis', () => {
  // Max possible Enterprising on the 30Q form is 25.
  const r: InterestProfilerRiasec = {
    realistic: 0, investigative: 0, artistic: 0,
    social: 0, enterprising: MINI_IP_MAX_PER_DIMENSION, conventional: 0,
  };
  const axes = riasecToRadarAxes(r);
  // Strategy weight: enterprising * 0.7 + conventional * 0.3.
  // With E maxed and C zero → 0.7.
  assert.equal(axisValue(axes, 'Strategy'), 0.7);
});

test('riasecToRadarAxes — sample user (R8 I10 A3 S11 E14 C6) reflects E/S dominance', () => {
  const axes = riasecToRadarAxes({
    realistic: 8, investigative: 10, artistic: 3,
    social: 11, enterprising: 14, conventional: 6,
  });
  // Strategy = (14*0.7 + 6*0.3) / 25 = (9.8 + 1.8) / 25 = 0.464.
  assert.ok(Math.abs(axisValue(axes, 'Strategy') - 0.464) < 0.005);
  // Service = (11*0.75 + 14*0.25) / 25 = (8.25 + 3.5) / 25 = 0.47.
  assert.ok(Math.abs(axisValue(axes, 'Service') - 0.47) < 0.005);
  // Strategy + Service should be the two highest axes for this profile.
  const sorted = [...axes].sort((a, b) => b.value - a.value);
  assert.equal(sorted[0].axis, 'Service');
  assert.equal(sorted[1].axis, 'Strategy');
});

test('riasecToRadarAxes — no axis exceeds 1.0 even when both contributing dims are maxed', () => {
  const maxed: InterestProfilerRiasec = {
    realistic: MINI_IP_MAX_PER_DIMENSION,
    investigative: MINI_IP_MAX_PER_DIMENSION,
    artistic: MINI_IP_MAX_PER_DIMENSION,
    social: MINI_IP_MAX_PER_DIMENSION,
    enterprising: MINI_IP_MAX_PER_DIMENSION,
    conventional: MINI_IP_MAX_PER_DIMENSION,
  };
  for (const a of riasecToRadarAxes(maxed)) {
    assert.equal(a.value, 1);
  }
});

test('riasecToRadarAxes — investigative no longer dominates 4 of 6 axes', () => {
  const investigativeOnly: InterestProfilerRiasec = {
    realistic: 0,
    investigative: MINI_IP_MAX_PER_DIMENSION,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 0,
  };
  const axes = riasecToRadarAxes(investigativeOnly);
  // Investigative-driven: Analytics (0.7), Research (0.6).
  assert.equal(axisValue(axes, 'Analytics'), 0.7);
  assert.equal(axisValue(axes, 'Research'), 0.6);
  // Investigative contributes only secondarily to Engineering and Design.
  assert.ok(axisValue(axes, 'Engineering') <= 0.25 + 1e-9);
  assert.ok(axisValue(axes, 'Design') <= 0.15 + 1e-9);
  // Pure-I profile should not light up Strategy or Service at all.
  assert.equal(axisValue(axes, 'Strategy'), 0);
  assert.equal(axisValue(axes, 'Service'), 0);
});

test('riasecToRadarAxes — caller can override the per-dimension max for non-standard forms', () => {
  const r: InterestProfilerRiasec = {
    realistic: 0, investigative: 0, artistic: 0,
    social: 0, enterprising: 40, conventional: 0,
  };
  const axes = riasecToRadarAxes(r, { maxPerDimension: 40 });
  assert.equal(axisValue(axes, 'Strategy'), 0.7);
});

test('riasecToRadarAxes — out-of-range inputs are clamped, not allowed to exceed 1.0', () => {
  const r: InterestProfilerRiasec = {
    realistic: 999, investigative: 0, artistic: 0,
    social: 0, enterprising: 0, conventional: 0,
  };
  const axes = riasecToRadarAxes(r);
  // Engineering uses realistic at weight 0.75; clamped Realistic=1 → Engineering=0.75.
  assert.equal(axisValue(axes, 'Engineering'), 0.75);
});
