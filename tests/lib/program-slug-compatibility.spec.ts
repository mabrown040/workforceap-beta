import { describe, expect, it } from 'vitest';
import { getProgramBySlug } from '@/lib/content/programs';

describe('program slug compatibility', () => {
  const legacyProgramSlugs = [
    ['ai-practitioner-professional-certificate', 'ai-practitioner-professional-certificate-aws'],
    ['ai-professional-developer-certificate-ibm', 'software-developer-professional-certificate-ibm'],
    ['construction-readiness-certificate-osha-10', 'core-construction-training-certificate'],
    ['logistics-and-supply-chain-certificate-clt', 'certified-logistics-technician-clt'],
    ['production-technology-certificate-cpt', 'certified-production-technician-cpt'],
    ['google-it-support-certificate', 'it-support-professional-certificate-ibm'],
    ['data-analytics-google', 'data-analytics-professional-certificate-google'],
    ['cybersecurity-google', 'cybersecurity-professional-certificate-google'],
  ] as const;

  it.each(legacyProgramSlugs)('resolves legacy slug %s', (legacySlug, canonicalSlug) => {
    expect(getProgramBySlug(legacySlug)?.slug).toBe(canonicalSlug);
  });

  it('resolves canonical slugs directly', () => {
    expect(getProgramBySlug('software-developer-professional-certificate-ibm')?.slug).toBe(
      'software-developer-professional-certificate-ibm',
    );
  });

  it('does not present an IBM enrolment as an AWS certificate', () => {
    const program = getProgramBySlug('ai-professional-developer-certificate-ibm');
    expect(program?.slug).toBe('software-developer-professional-certificate-ibm');
    expect(program?.partner).toBe('IBM');
    expect(program?.title).toMatch(/IBM/i);
    expect(program?.title).not.toMatch(/AWS|Amazon/i);
  });
});
