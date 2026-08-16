import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHS_ENROLL_PATH,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
} from '@/lib/partners/chsPartner';
import {
  normalizePartnerRef,
  partnerRefFromEnrollPath,
} from '@/lib/apply/applyReferralCapture';
import { isSponsorshipActive, type SponsorshipPartner } from '@/lib/partners/sponsorship';

/**
 * Drift guard for the CHS launch link.
 *
 * The student link printed in the runbook and in the school email is
 * `/enroll/concordia`. Middleware turns that URL segment into the partner ref
 * and `/api/apply/signup` resolves it against `Partner.slug` — so if the slug
 * `scripts/create-chs-partner.ts` writes ever stops equaling the URL segment,
 * every student who uses the official link gets NO partner attribution and NO
 * funding stamp, silently. That is exactly the bug this constant exists to
 * make impossible.
 */

test('the /enroll path segment resolves to the CHS partner slug', () => {
  // Literal path, spelled out the way it appears in the runbook and email.
  assert.equal(partnerRefFromEnrollPath('/enroll/concordia'), CHS_PARTNER_SLUG);
  // …and the exported path constant cannot drift from the slug either.
  assert.equal(CHS_ENROLL_PATH, '/enroll/concordia');
  assert.equal(partnerRefFromEnrollPath(CHS_ENROLL_PATH), CHS_PARTNER_SLUG);
});

test('the CHS slug is itself a valid partner ref', () => {
  // If the slug were not normalizable, middleware would drop it before the
  // cookie was ever written.
  assert.equal(normalizePartnerRef(CHS_PARTNER_SLUG), CHS_PARTNER_SLUG);
});

test('the chs2026 referral code still resolves independently of the slug', () => {
  // `?ref=chs2026` links are already in circulation; the signup route matches
  // referralCode OR slug, so both must survive normalization.
  assert.equal(CHS_PARTNER_REFERRAL_CODE, 'chs2026');
  assert.equal(normalizePartnerRef(CHS_PARTNER_REFERRAL_CODE), CHS_PARTNER_REFERRAL_CODE);
  assert.notEqual(CHS_PARTNER_REFERRAL_CODE, CHS_PARTNER_SLUG);
});

test('the sponsorship window covers the whole labelled term', () => {
  assert.equal(CHS_SPONSORSHIP_TERM_LABEL, '2026');
  assert.equal(CHS_SPONSORSHIP_STARTS_AT.getUTCFullYear(), 2026);
  assert.equal(CHS_SPONSORSHIP_ENDS_AT.getUTCFullYear(), 2026);
  assert.ok(CHS_SPONSORSHIP_STARTS_AT.getTime() < CHS_SPONSORSHIP_ENDS_AT.getTime());
});

test('a partner provisioned from these constants sponsors for the whole term', () => {
  // Mirrors what scripts/create-chs-partner.ts writes. Without the
  // sponsorship columns `isSponsorshipActive` is always false and nothing is
  // ever stamped, which is the failure mode this pins.
  const partner: SponsorshipPartner = {
    id: 'partner-chs',
    name: 'Concordia High School',
    sponsoredEnrollment: true,
    sponsorshipFundingSource: 'PARTNER_ORG',
    sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
    sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
    sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
    sponsorshipSeatCap: null,
  };

  assert.equal(isSponsorshipActive(partner, new Date('2026-01-01T00:00:00Z')), true);
  assert.equal(isSponsorshipActive(partner, new Date('2026-08-14T12:00:00Z')), true);
  assert.equal(isSponsorshipActive(partner, new Date('2026-12-31T23:59:59Z')), true);
  assert.equal(isSponsorshipActive(partner, new Date('2025-12-31T23:59:59Z')), false);
  assert.equal(isSponsorshipActive(partner, new Date('2027-01-01T00:00:00Z')), false);
});
