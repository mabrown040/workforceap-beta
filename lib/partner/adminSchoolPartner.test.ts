import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isSchoolManagedPartner,
  partnerDirectoryMeta,
  sponsorshipStampFields,
  sponsorshipWindowFromTerm,
  validateAdminProgramSlugs,
} from './adminSchoolPartner';

describe('sponsorshipWindowFromTerm', () => {
  it('builds a UTC calendar year from a term label', () => {
    const window = sponsorshipWindowFromTerm('2026');
    assert.ok(window);
    assert.equal(window.startsAt.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(window.endsAt.toISOString(), '2026-12-31T23:59:59.000Z');
  });

  it('rejects empty or non-year labels', () => {
    assert.equal(sponsorshipWindowFromTerm(''), null);
    assert.equal(sponsorshipWindowFromTerm('pilot'), null);
  });
});

describe('validateAdminProgramSlugs', () => {
  it('requires at least one known slug when publishing', () => {
    const empty = validateAdminProgramSlugs([], { publishing: true });
    assert.equal(empty.ok, false);
    if (!empty.ok) {
      assert.match(empty.error, /at least one program/i);
    }
  });

  it('rejects unknown slugs', () => {
    const bad = validateAdminProgramSlugs(['not-a-real-program'], { publishing: false });
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.match(bad.error, /Unknown program slug/);
    }
  });

  it('accepts a live catalog slug', () => {
    const ok = validateAdminProgramSlugs(
      ['it-support-professional-certificate-ibm'],
      { publishing: true },
    );
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.deepEqual(ok.slugs, ['it-support-professional-certificate-ibm']);
    }
  });
});

describe('sponsorshipStampFields', () => {
  it('is empty when sponsorship is off', () => {
    assert.deepEqual(sponsorshipStampFields({ name: 'CHS', sponsoredEnrollment: false }), {});
  });

  it('writes a term window and note when sponsorship is on', () => {
    const fields = sponsorshipStampFields({
      name: 'Concordia High School',
      sponsoredEnrollment: true,
      sponsorshipTermLabel: '2026',
    });
    assert.equal(fields.sponsorshipNotes, 'Sponsored by Concordia High School (2026)');
    assert.ok(fields.sponsorshipStartsAt);
    assert.ok(fields.sponsorshipEndsAt);
  });
});

describe('partnerDirectoryMeta', () => {
  it('surfaces the public enroll path for a published school', () => {
    const meta = partnerDirectoryMeta({
      slug: 'concordia-high-school',
      partnerType: 'high_school',
      referralCode: 'chs2026',
      enrollmentPageEnabled: true,
    });
    assert.equal(meta.isSchool, true);
    assert.equal(meta.enrollPath, '/enroll/concordia');
    assert.equal(meta.referralCode, 'chs2026');
  });
});

describe('isSchoolManagedPartner', () => {
  it('is true for high_school or any published/sponsored row', () => {
    assert.equal(isSchoolManagedPartner({ partnerType: 'high_school' }), true);
    assert.equal(isSchoolManagedPartner({ enrollmentPageEnabled: true }), true);
    assert.equal(isSchoolManagedPartner({ sponsoredEnrollment: true }), true);
    assert.equal(isSchoolManagedPartner({ partnerType: 'community' }), false);
  });
});
