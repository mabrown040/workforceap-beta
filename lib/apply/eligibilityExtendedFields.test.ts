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
  ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES,
  ADMIN_REFERRAL_SOURCE_OPTIONS,
  REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
  REFERRAL_SOURCE_OTHER_PARTNER,
  normalizedReferralSourceKey,
  uniqueReferralSourceOptions,
} from '../referralSources';

const PREEXISTING_HEAR_ABOUT_OPTIONS = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions',
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

/** Organisations added from the 9/1/26 ops change list. */
const HEAR_ABOUT_OPTIONS_ADDED_9_1 = [
  'Workforce Solutions Greater Dallas',
  'Workforce Solutions Central Texas',
  'Workforce Solutions Gulf Coast',
  'Workforce Solutions Alamo',
  'Goodwill Central Texas',
  'Gary Job Corps',
  'Lifeworks',
  'Building Promise',
  'LifeAnew',
  'MSRW Management',
  'ACC (Austin Community College)',
  'Community First (Mobile Loaves and Fishes)',
  'Big Austin',
  'EGBI',
  'YMCA',
  'Boys and Girls Clubs',
  'Capital Idea',
  'Austin Free-Net',
  'Latinitas',
  'Veterans Affairs (VA)',
  'City of Austin',
  'State of Texas',
  'Austin Public Health (APH)',
  'AISD',
  'Texas Empowerment Academy',
  '100 Black Men',
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
  for (const option of HEAR_ABOUT_OPTIONS_ADDED_9_1) {
    assert.ok((APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(option), option);
  }
  assert.equal(
    APPLY_HEAR_ABOUT_OPTIONS.length,
    PREEXISTING_HEAR_ABOUT_OPTIONS.length + 2 + HEAR_ABOUT_OPTIONS_ADDED_9_1.length,
  );
  assert.equal(new Set(APPLY_HEAR_ABOUT_OPTIONS).size, APPLY_HEAR_ABOUT_OPTIONS.length);
  // The ops list also spelled two existing entries differently — those are
  // aliases of the existing rows, not new rows.
  assert.equal(
    normalizedReferralSourceKey('Launch Pad Job Club (LPJC)'),
    normalizedReferralSourceKey('Launch Pad Job Club'),
  );
  assert.equal(
    normalizedReferralSourceKey('PurposeWorks / Job Seekers Network'),
    normalizedReferralSourceKey('Purpose Works / Job Seekers Network'),
  );
});

test('admin referral dropdown removes normalized duplicates but accepts historical values', () => {
  const normalizedOptions = ADMIN_REFERRAL_SOURCE_OPTIONS.map(normalizedReferralSourceKey);
  assert.equal(new Set(normalizedOptions).size, normalizedOptions.length);

  assert.ok(ADMIN_REFERRAL_SOURCE_OPTIONS.includes(REFERRAL_SOURCE_OTHER_PARTNER));
  assert.ok(ADMIN_REFERRAL_SOURCE_OPTIONS.includes(REFERRAL_SOURCE_COMMUNITY_AMBASSADOR));
  assert.ok(!ADMIN_REFERRAL_SOURCE_OPTIONS.includes('WorkforceAP Counselor'));
  assert.ok(!ADMIN_REFERRAL_SOURCE_OPTIONS.includes('Church'));
  assert.ok(ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES.includes('WorkforceAP Counselor'));
  assert.ok(ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES.includes('Church'));
  assert.ok(ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES.includes('Workforce Solutions'));
  assert.ok(ADMIN_REFERRAL_SOURCE_OPTIONS.includes('Workforce Solutions'));

  for (const historicalValue of ['Community Organization', 'Flyer or Brochure', 'Social Media']) {
    assert.ok((ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES as readonly string[]).includes(historicalValue));
  }
});

test('public referral menu removes database/static duplicates without dropping new choices', () => {
  const combined = uniqueReferralSourceOptions([
    'Launch Pad Job Club',
    ' launch   pad job club ',
    'Purpose Works / Job Seekers Network',
    'New Community Partner',
  ]);

  assert.deepEqual(combined, [
    'Launch Pad Job Club',
    'Purpose Works / Job Seekers Network',
    'New Community Partner',
  ]);
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
