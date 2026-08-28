import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_HEAR_ABOUT_AMBASSADOR,
  APPLY_HEAR_ABOUT_OPTIONS,
  APPLY_HEAR_ABOUT_OTHER,
  APPLY_PARTNER_AMBASSADOR_WRITE_IN,
  APPLY_PARTNER_OTHER,
  APPLY_PARTNER_REFERRAL_OPTIONS,
  formatPartnerAmbassadorReferral,
  hearAboutNeedsOther,
  hearAboutSuggestsAmbassador,
  layoffCompanyApplicable,
  normalizeHearAbout,
  normalizeYesNo,
  parsePartnerAmbassadorReferral,
  partnerReferralNeedsWriteIn,
  partnerReferralWriteInMaxLength,
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

test('detects other + ambassador hear-about cases', () => {
  assert.equal(hearAboutNeedsOther(APPLY_HEAR_ABOUT_OTHER), true);
  assert.equal(hearAboutNeedsOther('Friend or family'), false);
  assert.equal(hearAboutSuggestsAmbassador(APPLY_HEAR_ABOUT_AMBASSADOR), true);
  assert.equal(hearAboutSuggestsAmbassador('Google / web search'), false);
});

test('partner referral dropdown exposes exactly the requested choices', () => {
  assert.deepEqual([...APPLY_PARTNER_REFERRAL_OPTIONS], [
    'Launch Pad Job Club',
    'Purpose Works / Job Seekers Network',
    'Workforce Solutions Capital Area',
    'Workforce Solutions Rural Capital Area',
    'Other Partner (write in)',
    'Community Ambassador (write in)',
  ]);
});

test('partner referral draft values parse and format without losing details', () => {
  assert.deepEqual(parsePartnerAmbassadorReferral('Launch Pad Job Club'), {
    selected: 'Launch Pad Job Club',
    writeIn: '',
  });
  assert.equal(
    formatPartnerAmbassadorReferral('Launch Pad Job Club', 'ignored stale value'),
    'Launch Pad Job Club',
  );

  const ambassadorStored = `${APPLY_PARTNER_AMBASSADOR_WRITE_IN}: Jane Doe`;
  const ambassador = parsePartnerAmbassadorReferral(ambassadorStored);
  assert.deepEqual(ambassador, {
    selected: APPLY_PARTNER_AMBASSADOR_WRITE_IN,
    writeIn: 'Jane Doe',
  });
  assert.equal(
    formatPartnerAmbassadorReferral(ambassador.selected, ambassador.writeIn),
    ambassadorStored,
  );
  assert.equal(partnerReferralNeedsWriteIn(APPLY_PARTNER_AMBASSADOR_WRITE_IN), true);
  assert.equal(partnerReferralNeedsWriteIn(APPLY_PARTNER_OTHER), true);

  const legacy = parsePartnerAmbassadorReferral('Ambassador Jane / code-abc');
  assert.deepEqual(legacy, {
    selected: APPLY_PARTNER_OTHER,
    writeIn: 'Ambassador Jane / code-abc',
  });
  assert.equal(
    formatPartnerAmbassadorReferral(legacy.selected, legacy.writeIn),
    'Ambassador Jane / code-abc',
  );
  assert.equal(partnerReferralWriteInMaxLength(APPLY_PARTNER_OTHER), 200);
  assert.equal(
    partnerReferralWriteInMaxLength(APPLY_PARTNER_AMBASSADOR_WRITE_IN),
    200 - APPLY_PARTNER_AMBASSADOR_WRITE_IN.length - 2,
  );
  assert.equal(
    formatPartnerAmbassadorReferral(APPLY_PARTNER_AMBASSADOR_WRITE_IN, 'x'.repeat(250)).length,
    200,
  );
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
