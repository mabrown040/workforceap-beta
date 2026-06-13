import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABOUT_THE_SAME_BAND,
  ALL_CLIFF_SOURCES,
  SNAP_RULES,
  TANF_RULES,
  clampHouseholdSize,
  computeCliff,
  estimateSnapMonthly,
  estimateTanfMonthly,
  isAdultMedicaidEligible,
  isChildCoverageEligible,
  monthlyEarnings,
  monthlyFpl,
} from './benefitsCliff';

test('every source carries a citation and lastVerified date', () => {
  for (const s of ALL_CLIFF_SOURCES) {
    assert.ok(s.program.length > 0);
    assert.ok(s.url.startsWith('https://'));
    assert.match(s.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(s.publisher.length > 0);
  }
});

test('monthlyEarnings converts hourly wage to gross monthly (52/12)', () => {
  // $15/hr × 40 h/wk = $600/wk → ×52/12 = $2,600/mo
  assert.equal(monthlyEarnings(15, 40), 2600);
  assert.equal(monthlyEarnings(0, 40), 0);
  assert.equal(monthlyEarnings(15, 0), 0);
  // Negative inputs clamp to 0
  assert.equal(monthlyEarnings(-5, 40), 0);
});

test('clampHouseholdSize bounds and floors', () => {
  assert.equal(clampHouseholdSize(0), 1);
  assert.equal(clampHouseholdSize(3.7), 3);
  assert.equal(clampHouseholdSize(99), 12);
  assert.equal(clampHouseholdSize(NaN), 1);
});

test('monthlyFpl matches 2025 guidelines', () => {
  assert.ok(Math.abs(monthlyFpl(1) - 15650 / 12) < 0.01);
  assert.ok(Math.abs(monthlyFpl(3) - (15650 + 2 * 5500) / 12) < 0.01);
});

test('SNAP: zero income gets the maximum allotment', () => {
  assert.equal(estimateSnapMonthly(1, 0), SNAP_RULES.maxAllotment[0]);
  assert.equal(estimateSnapMonthly(4, 0), SNAP_RULES.maxAllotment[3]);
});

test('SNAP: benefit falls as earnings rise, never negative', () => {
  const low = estimateSnapMonthly(3, 800);
  const mid = estimateSnapMonthly(3, 1600);
  assert.ok(low > mid);
  assert.ok(mid >= 0);
});

test('SNAP: gross income limit edge (130% FPL)', () => {
  const limit = SNAP_RULES.grossIncomeLimit[2]; // size 3 → $2,798
  assert.ok(estimateSnapMonthly(3, limit) >= 0); // at the limit: still tested against net
  assert.equal(estimateSnapMonthly(3, limit + 1), 0); // $1 over the cliff → 0
});

test('SNAP: minimum benefit floor for 1–2 person households', () => {
  // Pick an income just under the size-1 net limit so the formula would yield < $23.
  const b = estimateSnapMonthly(1, 1500); // under gross limit (1632), net under 1255
  assert.ok(b >= SNAP_RULES.minimumBenefitSize1to2);
});

test('SNAP: household sizes beyond 8 extend by per-additional increments', () => {
  const nine = estimateSnapMonthly(9, 0);
  assert.equal(nine, SNAP_RULES.maxAllotment[7] + SNAP_RULES.maxAllotmentPerAdditional);
});

test('TANF: all-or-nothing at the income limit', () => {
  const limit = TANF_RULES.incomeLimit[2]; // size 3
  assert.equal(estimateTanfMonthly(3, limit), TANF_RULES.maxGrant[2]);
  assert.equal(estimateTanfMonthly(3, limit + 1), 0);
});

test('Medicaid adult: eligible only near 15% FPL', () => {
  assert.equal(isAdultMedicaidEligible(3, 0), true);
  assert.equal(isAdultMedicaidEligible(3, 2000), false);
});

test('Child coverage: CHIP cap at ~201% FPL', () => {
  const cap = monthlyFpl(3) * 2.01;
  assert.equal(isChildCoverageEligible(3, cap - 1), true);
  assert.equal(isChildCoverageEligible(3, cap + 1), false);
});

test('computeCliff: better off when offer clearly beats lost benefits', () => {
  const r = computeCliff({
    householdSize: 3,
    receives: ['snap'],
    currentMonthlyEarnings: 0,
    offerHourlyWage: 22,
    offerHoursPerWeek: 40,
  });
  assert.equal(r.verdict, 'better_off');
  assert.ok(r.netChangeMonthly > ABOUT_THE_SAME_BAND);
  const snap = r.programs.find((p) => p.programId === 'snap');
  assert.ok(snap);
  assert.equal(snap.losesEligibility, true); // $3,813/mo > gross limit for size 3
});

test('computeCliff: about the same when no earnings change and benefits unchanged', () => {
  const r = computeCliff({
    householdSize: 2,
    receives: ['snap'],
    currentMonthlyEarnings: 1000,
    offerHourlyWage: 1000 * 12 / 52 / 40, // same monthly earnings
    offerHoursPerWeek: 40,
  });
  assert.equal(r.verdict, 'about_the_same');
  assert.ok(Math.abs(r.netChangeMonthly) <= ABOUT_THE_SAME_BAND);
});

test('computeCliff: respects member-supplied current SNAP amount', () => {
  const r = computeCliff({
    householdSize: 3,
    receives: ['snap'],
    currentMonthlyEarnings: 0,
    currentSnapMonthly: 500,
    offerHourlyWage: 25,
    offerHoursPerWeek: 40,
  });
  const snap = r.programs.find((p) => p.programId === 'snap');
  assert.ok(snap);
  assert.equal(snap.currentMonthly, 500);
  assert.equal(snap.newMonthly, 0);
  assert.equal(snap.changeMonthly, -500);
});

test('computeCliff: flags health coverage loss without counting dollars', () => {
  const r = computeCliff({
    householdSize: 3,
    receives: ['medicaidAdult', 'medicaidChild'],
    currentMonthlyEarnings: 0,
    offerHourlyWage: 20,
    offerHoursPerWeek: 40, // $3,466/mo: over adult cap, under CHIP cap? CHIP cap size 3 ≈ $4,464
  });
  const adult = r.programs.find((p) => p.programId === 'medicaidAdult');
  const child = r.programs.find((p) => p.programId === 'medicaidChild');
  assert.ok(adult && child);
  assert.equal(adult.losesEligibility, true);
  assert.equal(child.losesEligibility, false);
  assert.equal(r.losesHealthCoverage, true);
  // Coverage programs never contribute dollars
  assert.equal(adult.changeMonthly, 0);
});

test('computeCliff: worse off when a small raise wipes out TANF + SNAP', () => {
  const r = computeCliff({
    householdSize: 3,
    receives: ['snap', 'tanf'],
    currentMonthlyEarnings: 100,
    currentSnapMonthly: 740,
    currentTanfMonthly: 390,
    offerHourlyWage: 7.25,
    offerHoursPerWeek: 12, // ≈ $377/mo: tiny raise, loses TANF, SNAP drops a little
  });
  const tanf = r.programs.find((p) => p.programId === 'tanf');
  assert.ok(tanf);
  assert.equal(tanf.losesEligibility, true);
  assert.equal(r.verdict, 'worse_off');
});

test('computeCliff: deterministic — same input, same output', () => {
  const input = {
    householdSize: 4,
    receives: ['snap', 'tanf', 'medicaidChild'] as const,
    currentMonthlyEarnings: 600,
    offerHourlyWage: 16.5,
    offerHoursPerWeek: 32,
  };
  const a = computeCliff({ ...input, receives: [...input.receives] });
  const b = computeCliff({ ...input, receives: [...input.receives] });
  assert.deepEqual(a, b);
});
