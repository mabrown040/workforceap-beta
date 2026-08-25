import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countSoftQualifyYes,
  laidOffCompanyRequired,
  partnerReferralNeedsWriteIn,
  softQualifies,
} from './eligibilityQuestionnaire';

describe('eligibilityQuestionnaire', () => {
  it('softQualifies when any funding signal is yes', () => {
    assert.equal(
      softQualifies({
        currentlyUnemployed: 'no',
        receivingUnemployment: 'no',
        unemploymentRanOut: 'no',
        onSnapWicFoodStamps: 'no',
        incomeBelow60k: 'yes',
      }),
      true
    );
    assert.equal(
      softQualifies({
        currentlyUnemployed: 'no',
        receivingUnemployment: 'no',
        unemploymentRanOut: 'no',
        onSnapWicFoodStamps: 'no',
        incomeBelow60k: 'no',
      }),
      false
    );
  });

  it('counts soft-qualify yes answers', () => {
    assert.equal(
      countSoftQualifyYes({
        currentlyUnemployed: 'yes',
        receivingUnemployment: 'yes',
        unemploymentRanOut: 'no',
        onSnapWicFoodStamps: 'yes',
        incomeBelow60k: 'no',
      }),
      3
    );
  });

  it('requires laid-off company when unemployment answers are yes', () => {
    assert.equal(
      laidOffCompanyRequired({
        currentlyUnemployed: 'yes',
        receivingUnemployment: 'no',
        unemploymentRanOut: 'no',
        onSnapWicFoodStamps: 'no',
        incomeBelow60k: 'no',
      }),
      true
    );
    assert.equal(
      laidOffCompanyRequired({
        currentlyUnemployed: 'no',
        receivingUnemployment: 'no',
        unemploymentRanOut: 'no',
        onSnapWicFoodStamps: 'yes',
        incomeBelow60k: 'yes',
      }),
      false
    );
  });

  it('detects partner write-in options', () => {
    assert.equal(partnerReferralNeedsWriteIn('other_partner'), true);
    assert.equal(partnerReferralNeedsWriteIn('community_ambassador'), true);
    assert.equal(partnerReferralNeedsWriteIn('launch_pad_job_club'), false);
  });
});
