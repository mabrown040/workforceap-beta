import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_HEAR_ABOUT_AMBASSADOR,
  APPLY_HEAR_ABOUT_OPTIONS,
  APPLY_HEAR_ABOUT_OTHER,
  hearAboutNeedsOther,
  hearAboutSuggestsAmbassador,
  layoffCompanyApplicable,
  normalizeHearAbout,
  normalizeYesNo,
} from './eligibilityExtendedFields';

test('normalizes yes/no and rejects other values', () => {
  assert.equal(normalizeYesNo('yes'), 'yes');
  assert.equal(normalizeYesNo('no'), 'no');
  assert.equal(normalizeYesNo('maybe'), null);
  assert.equal(normalizeYesNo(null), null);
});

test('includes ambassador and other in hear-about options', () => {
  assert.equal(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(APPLY_HEAR_ABOUT_AMBASSADOR),
    true,
  );
  assert.equal(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(APPLY_HEAR_ABOUT_OTHER),
    true,
  );
});

test('detects other + ambassador hear-about cases', () => {
  assert.equal(hearAboutNeedsOther(APPLY_HEAR_ABOUT_OTHER), true);
  assert.equal(hearAboutNeedsOther('Friend or family'), false);
  assert.equal(hearAboutSuggestsAmbassador(APPLY_HEAR_ABOUT_AMBASSADOR), true);
  assert.equal(hearAboutSuggestsAmbassador('Google / web search'), false);
});

test('trims and caps hear-about strings', () => {
  assert.equal(normalizeHearAbout('  Friend or family  '), 'Friend or family');
  assert.equal(normalizeHearAbout(''), null);
  assert.equal(normalizeHearAbout('x'.repeat(250))?.length, 200);
});

test('always shows layoff / last-employer company in eligibility block', () => {
  assert.equal(
    layoffCompanyApplicable({
      unemployedOrUnderemployed: 'no',
      receivingUnemployment: 'no',
      exhaustedUnemployment: 'no',
    }),
    true,
  );
  assert.equal(
    layoffCompanyApplicable({
      unemployedOrUnderemployed: null,
      receivingUnemployment: null,
      exhaustedUnemployment: null,
    }),
    true,
  );
  assert.equal(
    layoffCompanyApplicable({
      unemployedOrUnderemployed: 'yes',
      receivingUnemployment: 'no',
      exhaustedUnemployment: 'no',
    }),
    true,
  );
});
