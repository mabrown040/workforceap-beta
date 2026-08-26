import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_HEAR_ABOUT_AMBASSADOR,
  APPLY_HEAR_ABOUT_GROUPS,
  APPLY_HEAR_ABOUT_OPTIONS,
  APPLY_HEAR_ABOUT_OTHER,
  APPLY_PARTNER_AMBASSADOR_WRITEIN,
  APPLY_PARTNER_OTHER,
  APPLY_PARTNER_REFERRAL_OPTIONS,
  applyHearAboutCoversPublicSources,
  formatPartnerAmbassadorReferral,
  hearAboutNeedsOther,
  hearAboutSuggestsAmbassador,
  layoffCompanyApplicable,
  normalizeHearAbout,
  normalizeYesNo,
  parsePartnerAmbassadorReferral,
  partnerReferralNeedsWriteIn,
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

test('hear-about dropdown has a populated Central Texas list (not placeholder-only)', () => {
  assert.ok(APPLY_HEAR_ABOUT_OPTIONS.length >= 10);
  assert.equal(new Set(APPLY_HEAR_ABOUT_OPTIONS).size, APPLY_HEAR_ABOUT_OPTIONS.length);
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Launch Pad Job Club'));
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Purpose Works / Job Seekers Network'));
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Google / web search'));
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Friend or family'));
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Workforce Solutions Capital Area'));
});

test('hear-about menu is grouped and includes named partners', () => {
  assert.equal(applyHearAboutCoversPublicSources(), true);
  assert.ok(APPLY_HEAR_ABOUT_GROUPS.length >= 3);
  assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Launch Pad Job Club'));
  assert.ok(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes('Purpose Works / Job Seekers Network'),
  );
  assert.equal(APPLY_HEAR_ABOUT_OPTIONS[0], 'Launch Pad Job Club');
});

test('partner referral dropdown matches the 8/24 named orgs plus write-ins', () => {
  assert.deepEqual([...APPLY_PARTNER_REFERRAL_OPTIONS], [
    'Launch Pad Job Club',
    'Purpose Works / Job Seekers Network',
    'Workforce Solutions Capital Area',
    'Workforce Solutions Rural Capital Area',
    APPLY_PARTNER_OTHER,
    APPLY_PARTNER_AMBASSADOR_WRITEIN,
  ]);
  assert.equal(partnerReferralNeedsWriteIn(APPLY_PARTNER_OTHER), true);
  assert.equal(partnerReferralNeedsWriteIn('Launch Pad Job Club'), false);
  assert.equal(
    formatPartnerAmbassadorReferral(APPLY_PARTNER_OTHER, 'Jane at church'),
    `${APPLY_PARTNER_OTHER}: Jane at church`,
  );
  assert.deepEqual(parsePartnerAmbassadorReferral(`${APPLY_PARTNER_OTHER}: Jane at church`), {
    selected: APPLY_PARTNER_OTHER,
    writeIn: 'Jane at church',
  });
  assert.deepEqual(parsePartnerAmbassadorReferral('Launch Pad Job Club'), {
    selected: 'Launch Pad Job Club',
    writeIn: '',
  });
  assert.deepEqual(parsePartnerAmbassadorReferral('Free-text leftover'), {
    selected: APPLY_PARTNER_OTHER,
    writeIn: 'Free-text leftover',
  });
});

test('detects other + ambassador hear-about cases', () => {
  assert.equal(hearAboutNeedsOther(APPLY_HEAR_ABOUT_OTHER), true);
  assert.equal(hearAboutNeedsOther('Friend or family'), false);
  assert.equal(hearAboutSuggestsAmbassador(APPLY_HEAR_ABOUT_AMBASSADOR), true);
  assert.equal(hearAboutSuggestsAmbassador('Launch Pad Job Club'), true);
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
