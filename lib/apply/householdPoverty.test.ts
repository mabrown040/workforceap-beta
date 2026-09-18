import test from 'node:test';
import assert from 'node:assert/strict';
import {
  householdPovertyOptions,
  normalizeHouseholdSize,
  povertyGuidelineLabel,
} from './householdPoverty';

test('household poverty dropdown shows 1–4 person FPL amounts', () => {
  const options = householdPovertyOptions();
  assert.equal(options.length, 4);
  assert.equal(options[0].size, 1);
  assert.equal(options[0].annualAmount, 15650);
  assert.equal(options[1].annualAmount, 21150);
  assert.equal(options[2].annualAmount, 26650);
  assert.equal(options[3].annualAmount, 32150);
  assert.match(options[0].label, /1 person/);
  assert.match(options[3].label, /4 people/);
});

test('normalizes household size and formats the guideline staff see', () => {
  assert.equal(normalizeHouseholdSize('3'), 3);
  assert.equal(normalizeHouseholdSize(4), 4);
  assert.equal(normalizeHouseholdSize('9'), null);
  assert.match(povertyGuidelineLabel(2) ?? '', /21,150/);
});
