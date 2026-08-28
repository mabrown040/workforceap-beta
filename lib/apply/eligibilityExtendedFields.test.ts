import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
import {
  REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
  REFERRAL_SOURCE_OTHER_PARTNER,
} from '../referralSources';

const PREEXISTING_HEAR_ABOUT_OPTIONS = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  'Texas Workforce Commission (TWC)',
  'Austin Area Urban League',
  'African American Youth Harvest Foundation',
  '211 Texas',
  'Community organization',
  'Church or faith community',
  'Flyer or brochure',
  'Friend or family',
  'Google / web search',
  'Social media',
  'WorkforceAP counselor or team member',
  'Other / write in',
  'Partner or community ambassador',
] as const;

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

test('hear-about dropdown preserves every existing choice and adds new choices once', () => {
  for (const option of PREEXISTING_HEAR_ABOUT_OPTIONS) {
    assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(option), option);
  }
  assert.ok(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(REFERRAL_SOURCE_OTHER_PARTNER),
  );
  assert.ok(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(
      REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
    ),
  );
  assert.equal(APPLY_HEAR_ABOUT_OPTIONS.length, PREEXISTING_HEAR_ABOUT_OPTIONS.length + 2);
  assert.equal(new Set(APPLY_HEAR_ABOUT_OPTIONS).size, APPLY_HEAR_ABOUT_OPTIONS.length);
});

test('detects other + ambassador hear-about cases', () => {
  assert.equal(hearAboutNeedsOther(APPLY_HEAR_ABOUT_OTHER), true);
  assert.equal(hearAboutNeedsOther(REFERRAL_SOURCE_OTHER_PARTNER), true);
  assert.equal(hearAboutNeedsOther(REFERRAL_SOURCE_COMMUNITY_AMBASSADOR), true);
  assert.equal(hearAboutNeedsOther('Friend or family'), false);
  assert.equal(hearAboutSuggestsAmbassador(APPLY_HEAR_ABOUT_AMBASSADOR), true);
  assert.equal(hearAboutSuggestsAmbassador(REFERRAL_SOURCE_OTHER_PARTNER), true);
  assert.equal(hearAboutSuggestsAmbassador(REFERRAL_SOURCE_COMMUNITY_AMBASSADOR), true);
  assert.equal(hearAboutSuggestsAmbassador('Google / web search'), false);
});

test('keeps the optional referral name or code field instead of adding a second source dropdown', () => {
  const source = readFileSync(
    join(process.cwd(), 'app/apply/ApplyEligibilityClient.tsx'),
    'utf8',
  );
  assert.match(
    source,
    /<input[\s\S]*?id="apply-partner-ambassador"[\s\S]*?name="partnerAmbassadorReferral"/,
  );
  assert.doesNotMatch(source, /APPLY_PARTNER_REFERRAL_OPTIONS/);
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
