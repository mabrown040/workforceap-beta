import { describe, it, expect } from 'vitest';
import { Prisma, $Enums } from '@prisma/client';

/**
 * Phase B1 schema guard.
 *
 * Asserts that the partner-school sponsorship additions actually reached the
 * GENERATED Prisma client, not just prisma/schema.prisma. A schema edit that
 * is never followed by `prisma generate` leaves the client stale, and every
 * downstream consumer then fails at runtime with a confusing "unknown field"
 * error rather than at build time.
 *
 * Deliberately dependency-light: it reads static metadata objects off the
 * client (scalar field enums, model names, enum values) and never constructs
 * a PrismaClient or touches a database, so it runs in CI with no DATABASE_URL.
 */
describe('partner-school sponsorship schema (Phase B1)', () => {
  it('exposes the PartnerProgramCatalog model', () => {
    expect(Prisma.ModelName.PartnerProgramCatalog).toBe('PartnerProgramCatalog');
  });

  it('gives PartnerProgramCatalog its curated-list columns', () => {
    const fields = Object.keys(Prisma.PartnerProgramCatalogScalarFieldEnum);
    expect(fields).toEqual(
      expect.arrayContaining(['partnerId', 'programSlug', 'displayOrder', 'featured', 'note'])
    );
  });

  it('adds guardian_consent to TokenLinkType without dropping existing values', () => {
    expect($Enums.TokenLinkType.guardian_consent).toBe('guardian_consent');
    // The under-18 consent link is additive: the two pre-existing link types
    // must keep working, since live tokens reference them.
    expect($Enums.TokenLinkType.interview_prep).toBe('interview_prep');
    expect($Enums.TokenLinkType.eligibility_questionnaire).toBe('eligibility_questionnaire');
  });

  it('adds the sponsorship and enrollment-page fields to Partner', () => {
    const fields = Object.keys(Prisma.PartnerScalarFieldEnum);
    expect(fields).toEqual(
      expect.arrayContaining([
        'sponsoredEnrollment',
        'sponsorshipFundingSource',
        'sponsorshipTermLabel',
        'sponsorshipStartsAt',
        'sponsorshipEndsAt',
        'sponsorshipSeatCap',
        'sponsorshipNotes',
        'enrollmentPageEnabled',
        'enrollmentHeadline',
        'enrollmentBlurb',
        'schoolDistrict',
      ])
    );
  });

  it('adds sponsoredByPartnerId provenance to CourseEnrollment', () => {
    const fields = Object.keys(Prisma.CourseEnrollmentScalarFieldEnum);
    expect(fields).toContain('sponsoredByPartnerId');
    // Provenance sits alongside the existing funding columns rather than
    // replacing them.
    expect(fields).toEqual(expect.arrayContaining(['fundingSource', 'fundingNotes']));
  });

  it('keeps PARTNER_ORG available as the sponsorship funding source', () => {
    // scripts/seed-partner-school.ts writes this value into
    // Partner.sponsorshipFundingSource.
    expect($Enums.FundingSource.PARTNER_ORG).toBe('PARTNER_ORG');
  });
});
