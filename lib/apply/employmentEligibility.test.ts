import test from 'node:test';
import assert from 'node:assert/strict';
import { employmentFitLabel, scoreEmploymentEligibility } from './employmentEligibility';

test('unemployed, exhausted benefits, or underemployed auto-qualify', () => {
  assert.equal(
    scoreEmploymentEligibility({
      unemployed: 'yes',
      receivingUnemployment: 'no',
      exhaustedUnemployment: 'no',
      underemployed: 'no',
    }).fit,
    'qualify',
  );
  assert.equal(
    scoreEmploymentEligibility({
      unemployed: 'no',
      receivingUnemployment: 'no',
      exhaustedUnemployment: 'yes',
      underemployed: 'no',
    }).qualifies,
    true,
  );
  assert.equal(
    scoreEmploymentEligibility({
      unemployed: 'no',
      receivingUnemployment: 'no',
      exhaustedUnemployment: 'no',
      underemployed: 'yes',
    }).fit,
    'qualify',
  );
});

test('receiving unemployment alone is case by case', () => {
  const score = scoreEmploymentEligibility({
    unemployed: 'no',
    receivingUnemployment: 'yes',
    exhaustedUnemployment: 'no',
    underemployed: 'no',
  });
  assert.equal(score.fit, 'case_by_case');
  assert.equal(score.qualifies, false);
  assert.equal(employmentFitLabel(score.fit), 'case by case');
});

test('all-no answers stay in review', () => {
  const score = scoreEmploymentEligibility({
    unemployed: 'no',
    receivingUnemployment: 'no',
    exhaustedUnemployment: 'no',
    underemployed: 'no',
  });
  assert.equal(score.fit, 'review');
  assert.equal(score.yesCount, 0);
});
