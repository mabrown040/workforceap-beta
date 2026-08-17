import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { PROGRAMS } from '../../lib/content/programs';
import { CHS_PARTNER_SLUG, CHS_PROGRAM_SLUGS } from '@/lib/partners/chsPartner';
import {
  enrollmentPathForSlug,
  enrollPageCopyIsStakeSafe,
} from '../../lib/enroll/resolveEnrollmentPartner';

describe('Concordia HS enrollment page — chs2026 referral', () => {
  const pageSource = readFileSync(
    path.resolve(__dirname, '../../app/enroll/[school]/page.tsx'),
    'utf-8',
  );
  const viewSource = readFileSync(
    path.resolve(__dirname, '../../components/marketing/PartnerSchoolEnrollPage.tsx'),
    'utf-8',
  );
  const scriptSource = readFileSync(
    path.resolve(__dirname, '../../scripts/create-chs-partner.ts'),
    'utf-8',
  );

  it('keeps the public URL /enroll/concordia', () => {
    expect(CHS_PARTNER_SLUG).toBe('concordia');
    expect(enrollmentPathForSlug(CHS_PARTNER_SLUG)).toBe('/enroll/concordia');
    expect(enrollmentPathForSlug('concordia-high-school')).toBe('/enroll/concordia');
  });

  it('pins the chs2026 referral code and routes every apply CTA through it', () => {
    expect(scriptSource).toContain('const REFERRAL_CODE = CHS_PARTNER_REFERRAL_CODE');
    expect(readFileSync(path.resolve(__dirname, '../../lib/partners/chsPartner.ts'), 'utf-8')).toContain(
      "export const CHS_PARTNER_REFERRAL_CODE = 'chs2026'",
    );
    expect(viewSource).toContain('partnerApplyHref(model.referralCode)');
    expect(viewSource).toContain('partnerApplyHref(model.referralCode, slug)');
    expect(viewSource).toContain('partnerProgramHref(model.referralCode, slug)');
    expect(viewSource).toContain('href={applyBase}');
    expect(viewSource).toContain('href={applyUrl(p.slug)}');
    expect(viewSource).toContain('href={programUrl(p.slug)}');
    expect(viewSource).toContain('Sponsored by {shortName}');
  });

  it('lists only slugs that exist in the canonical PROGRAMS data', () => {
    expect(scriptSource).toContain('const PROGRAM_SLUGS = CHS_PROGRAM_SLUGS');
    expect(CHS_PROGRAM_SLUGS).toHaveLength(5);
    const known = new Set(PROGRAMS.map((p) => p.slug));
    for (const slug of CHS_PROGRAM_SLUGS) {
      expect(known.has(slug), `unknown program slug on Concordia catalog: ${slug}`).toBe(true);
    }
  });

  it('uses the locked sponsorship cost copy and never the banned word', () => {
    expect(scriptSource).toMatch(/no cost to Concordia High School students/i);
    expect(scriptSource).toContain('2026');
    expect(scriptSource).not.toMatch(/\bfree\b/i);
    expect(enrollPageCopyIsStakeSafe(
      'Career training and certifications offered at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership.',
    )).toBe(true);
  });

  it('is excluded from search indexing', () => {
    expect(pageSource).toContain('index: false');
  });
});
