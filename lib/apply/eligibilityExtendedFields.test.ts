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
  GENERIC_REFERRAL_CHANNELS,
  PARTNER_REFERRAL_SOURCES,
  REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
  REFERRAL_SOURCE_OTHER_PARTNER,
  normalizedReferralSourceKey,
  uniqueReferralSourceOptions,
} from '../referralSources';

/** Exact partner order from the 9/2/26 ops change list. */
const PARTNER_ORDER_9_2 = [
  'PurposeWorks / Job Seekers Network',
  'Launch Pad Job Club (LPJC)',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  'Community Ambassador (write in)',
  'ACC (Austin Community College)',
  'African American Youth Harvest Foundation (AAYHF)',
  'AISD',
  'Austin Area Urban League (AAUL)',
  'Austin Career Institute',
  'Austin Free-Net',
  'Austin Public Health (APH)',
  'Big Austin',
  'Boys and Girls Clubs',
  'Building Promise',
  'Capital Idea',
  'City of Austin',
  'Concordia College',
  'Concordia High School',
  'Community First (Mobile Loaves and Fishes)',
  'EGBI',
  'Gary Job Corps',
  'Goodwill Central Texas',
  'Latinitas',
  'LifeAnew',
  'Lifeworks',
  'MSRW Management',
  'North East High School (Reagan)',
  'Southern Careers Institute',
  'State of Texas',
  'Texas Empowerment Academy',
  'Universal Tech Movement (UTM)',
  'Veterans Affairs (VA)',
  'Workforce Solutions Alamo',
  'Workforce Solutions Central Texas',
  'Workforce Solutions Greater Dallas',
  'Workforce Solutions Gulf Coast',
  'Workforce Solutions (Other)',
  'YMCA',
  '100 Black Men of Austin',
  'Other Partner (write in)',
] as const;

/** Non-partner channels that pre-date the partner list and must survive it. */
const GENERIC_CHANNELS = [
  'Texas Workforce Commission (TWC)',
  '211 Texas',
  'Community organization',
  'Church or faith community',
  'Flyer or brochure',
  'Friend or family',
  'Google / web search',
  'Social media',
  'WorkforceAP counselor or team member',
  'Other / write in',
] as const;

test('normalizes yes/no and rejects other values', () => {
  assert.equal(normalizeYesNo('yes'), 'yes');
  assert.equal(normalizeYesNo('no'), 'no');
  assert.equal(normalizeYesNo('maybe'), null);
  assert.equal(normalizeYesNo(null), null);
});

test('includes ambassador and other in hear-about options', () => {
  assert.equal(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(REFERRAL_SOURCE_COMMUNITY_AMBASSADOR),
    true,
  );
  assert.equal(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(APPLY_HEAR_ABOUT_OTHER),
    true,
  );
});

test('hear-about dropdown follows the 9/2/26 ops order, then generic channels, with no duplicates', () => {
  assert.deepEqual([...PARTNER_REFERRAL_SOURCES], [...PARTNER_ORDER_9_2]);
  assert.deepEqual([...GENERIC_REFERRAL_CHANNELS], [...GENERIC_CHANNELS]);
  assert.deepEqual([...APPLY_HEAR_ABOUT_OPTIONS], [...PARTNER_ORDER_9_2, ...GENERIC_CHANNELS]);
  assert.ok(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(REFERRAL_SOURCE_OTHER_PARTNER),
  );
  assert.ok(
    (APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(
      REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
    ),
  );
  // Ops asked for a duplicate check: no two rows may collapse to the same organisation.
  const normalized = APPLY_HEAR_ABOUT_OPTIONS.map(normalizedReferralSourceKey);
  assert.equal(new Set(normalized).size, APPLY_HEAR_ABOUT_OPTIONS.length);
  // The old duplicate ambassador row is gone from the menu but still recognised.
  assert.ok(!(APPLY_HEAR_ABOUT_OPTIONS as readonly string[]).includes(APPLY_HEAR_ABOUT_AMBASSADOR));
  // Earlier spellings normalise onto the renamed rows so stored answers still match.
  assert.equal(
    normalizedReferralSourceKey('Launch Pad Job Club'),
    normalizedReferralSourceKey('Launch Pad Job Club (LPJC)'),
  );
  assert.equal(
    normalizedReferralSourceKey('Purpose Works / Job Seekers Network'),
    normalizedReferralSourceKey('PurposeWorks / Job Seekers Network'),
  );
  assert.equal(
    normalizedReferralSourceKey('Workforce Capital Area'),
    normalizedReferralSourceKey('Workforce Solutions Capital Area'),
  );
  assert.equal(
    normalizedReferralSourceKey('Workforce Solutions'),
    normalizedReferralSourceKey('Workforce Solutions (Other)'),
  );
  assert.equal(
    normalizedReferralSourceKey('Austin Area Urban League'),
    normalizedReferralSourceKey('Austin Area Urban League (AAUL)'),
  );
  assert.equal(
    normalizedReferralSourceKey('African American Youth Harvest Foundation'),
    normalizedReferralSourceKey('African American Youth Harvest Foundation (AAYHF)'),
  );
  assert.equal(
    normalizedReferralSourceKey('100 Black Men'),
    normalizedReferralSourceKey('100 Black Men of Austin'),
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
  assert.ok(ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES.includes('Purpose Works / Job Seekers Network'));
  // The legacy generic row collapses onto the renamed "(Other)" row in the menu.
  assert.ok(ADMIN_REFERRAL_SOURCE_OPTIONS.includes('Workforce Solutions (Other)'));
  assert.ok(!ADMIN_REFERRAL_SOURCE_OPTIONS.includes('Workforce Solutions'));

  for (const historicalValue of ['Community Organization', 'Flyer or Brochure', 'Social Media']) {
    assert.ok((ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES as readonly string[]).includes(historicalValue));
  }
});

test('public referral menu removes database/static duplicates without dropping new choices', () => {
  const combined = uniqueReferralSourceOptions([
    'Launch Pad Job Club (LPJC)',
    ' launch   pad job club ',
    'PurposeWorks / Job Seekers Network',
    'Purpose Works / Job Seekers Network',
    'New Community Partner',
  ]);

  assert.deepEqual(combined, [
    'Launch Pad Job Club (LPJC)',
    'PurposeWorks / Job Seekers Network',
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
