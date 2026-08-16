import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLY_REFERRAL_COOKIE,
  buildSponsorshipStamp,
  isActiveSponsorship,
  isSchoolApplyVariant,
  normalizePartnerRef,
  readReferralCookieFromHeader,
  referralCookieSetOptions,
} from './sponsoredEnrollment';

const base = {
  id: 'p1',
  name: 'Concordia High School',
  slug: 'concordia-high-school',
  referralCode: 'chs2026',
  partnerType: 'high_school',
  sponsoredEnrollment: true,
  sponsorshipFundingSource: 'PARTNER_ORG' as const,
  sponsorshipTermLabel: '2026',
  sponsorshipStartsAt: new Date('2026-01-01T00:00:00.000Z'),
  sponsorshipEndsAt: new Date('2026-12-31T23:59:59.000Z'),
  sponsorshipNotes: 'Sponsored by Concordia High School (2026)',
};

describe('normalizePartnerRef', () => {
  it('lowercases and trims a valid code', () => {
    assert.equal(normalizePartnerRef(' CHS2026 '), 'chs2026');
  });

  it('rejects empty, oversized, or punctuation-laden values', () => {
    assert.equal(normalizePartnerRef(''), null);
    assert.equal(normalizePartnerRef(null), null);
    assert.equal(normalizePartnerRef('chs 2026'), null);
    assert.equal(normalizePartnerRef('x'.repeat(65)), null);
    assert.equal(normalizePartnerRef('../admin'), null);
  });
});

describe('isActiveSponsorship', () => {
  it('is true inside the term window', () => {
    assert.equal(isActiveSponsorship(base, new Date('2026-08-14T00:00:00.000Z')), true);
  });

  it('is false when sponsoredEnrollment is off', () => {
    assert.equal(
      isActiveSponsorship({ ...base, sponsoredEnrollment: false }, new Date('2026-08-14T00:00:00.000Z')),
      false,
    );
  });

  it('is false before the window and after the window', () => {
    assert.equal(isActiveSponsorship(base, new Date('2025-12-31T23:59:59.000Z')), false);
    assert.equal(isActiveSponsorship(base, new Date('2027-01-01T00:00:00.000Z')), false);
  });

  it('treats a date-less sponsored row as open-ended', () => {
    assert.equal(
      isActiveSponsorship({
        sponsoredEnrollment: true,
        sponsorshipStartsAt: null,
        sponsorshipEndsAt: null,
      }),
      true,
    );
  });
});

describe('isSchoolApplyVariant', () => {
  it('is true for high_school or any sponsored partner', () => {
    assert.equal(isSchoolApplyVariant(base), true);
    assert.equal(isSchoolApplyVariant({ partnerType: 'community', sponsoredEnrollment: true }), true);
    assert.equal(isSchoolApplyVariant({ partnerType: 'community', sponsoredEnrollment: false }), false);
    assert.equal(isSchoolApplyVariant(null), false);
  });
});

describe('buildSponsorshipStamp', () => {
  it('uses the partner funding source, notes, and id', () => {
    assert.deepEqual(buildSponsorshipStamp(base), {
      fundingSource: 'PARTNER_ORG',
      fundingNotes: 'Sponsored by Concordia High School (2026)',
      sponsoredByPartnerId: 'p1',
    });
  });

  it('falls back to PARTNER_ORG and a generated note', () => {
    const stamp = buildSponsorshipStamp({
      id: 'p2',
      name: 'Riverside High School',
      sponsorshipFundingSource: null,
      sponsorshipTermLabel: '2027',
      sponsorshipNotes: null,
    });
    assert.equal(stamp.fundingSource, 'PARTNER_ORG');
    assert.equal(stamp.sponsoredByPartnerId, 'p2');
    assert.equal(stamp.fundingNotes, 'Sponsored by Riverside High School (2027)');
  });
});

describe('referral cookie helpers', () => {
  it('reads the named cookie from a header', () => {
    assert.equal(
      readReferralCookieFromHeader(`other=1; ${APPLY_REFERRAL_COOKIE}=CHS2026; theme=dark`),
      'chs2026',
    );
    assert.equal(readReferralCookieFromHeader('theme=dark'), null);
  });

  it('builds SameSite=Lax set options for a valid ref', () => {
    const opts = referralCookieSetOptions('CHS2026');
    assert.deepEqual(opts, {
      name: APPLY_REFERRAL_COOKIE,
      value: 'chs2026',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    assert.equal(referralCookieSetOptions('bad ref'), null);
  });
});
