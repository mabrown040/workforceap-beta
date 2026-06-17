import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('Employers Page — honest trust presentation', () => {
  it('uses placeholder aria-label and heading when verified metrics are unavailable', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');

    expect(source).toContain("t('trustAriaLabelLogosOnly')");
    expect(source).toContain("showLogosOnly ? t('trustLogosOnlyLabel')");
    expect(source).toContain("showLogosOnly ? t('trustLogosOnlyNote')");
    expect(source).toContain("t('trustPlaceholderHeading')");
    expect(source).toContain("t('trustVerifiedNote')");
    expect(source).toContain('employers-trust__stats--placeholder');
    expect(source).toContain("showVerifiedStats ? 'verified' : 'handshake'");
    expect(source).not.toContain("showVerifiedStats || showLogos ? 'verified'");
    expect(source).toContain('className="employers-hero"');
  });

  it('styles placeholder trust stats as a bordered panel at all breakpoints', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');
    expect(source).toContain('.employers-trust__stats--placeholder {');
    expect(source).toContain('padding: clamp(1rem, 3vw, 1.25rem);');
  });

  it('exports revalidate = 600 (10 minutes)', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');
    const match = source.match(/export\s+const\s+revalidate\s+=\s+(\d+)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBe(600);
  });

  it('labels verified placement cards differently from illustrative examples', () => {
    const pagePath = path.resolve(__dirname, '../../app/employers/page.tsx');
    const source = readFileSync(pagePath, 'utf-8');

    expect(source).toContain('usingVerifiedCaseStudies');
    expect(source).toContain("t('outcomesVerifiedLabel')");
    expect(source).toContain("t('outcomesScenarioLabel')");
    expect(source).toContain("t('outcomesTitleVerified')");
    expect(source).toContain("'outcomesVerifiedDisclaimer'");
    expect(source).toContain('outcomesDisclaimerKey');
    expect(source).toContain("t('partnerPlanCopy', { fee: placementFee })");
    expect(source).not.toContain(
      "scenarioLabel={study.attribution_name ? t('outcomesScenarioLabel') : t('outcomesScenarioLabel')}",
    );
  });

  it('aligns placeholder trust pricing and intake copy with pipeline subscription', () => {
    const messagesPath = path.resolve(__dirname, '../../messages/en.json');
    const messages = JSON.parse(readFileSync(messagesPath, 'utf-8')) as {
      marketing: { employers: Record<string, string> };
    };
    const copy = messages.marketing.employers;

    expect(copy.trustPlaceholderTermsTag).toBe('Pipeline subscription');
    expect(copy.trustPlaceholderTerms).toMatch(/per-placement/i);
    expect(copy.intakeCopy).toMatch(/pipeline subscription/i);
    expect(copy.intakeCopy).not.toMatch(/book a call/i);
  });

  it('uses a forward icon on the hero CTA instead of a calendar booking cue', () => {
    const ctaPath = path.resolve(
      __dirname,
      '../../components/marketing/employers/EmployersHeroCtaExperiment.tsx',
    );
    const source = readFileSync(ctaPath, 'utf-8');

    expect(source).toContain('arrow_forward');
    expect(source).not.toContain('calendar_today');
  });
});
