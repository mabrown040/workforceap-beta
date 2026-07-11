import { describe, expect, it } from 'vitest';
import { getProgramBySlug } from '@/lib/content/programs';

describe('program slug compatibility', () => {
  const legacyProgramSlugs = [
    ['ai-practitioner-professional-certificate', 'ai-practitioner-professional-certificate-aws'],
    ['ai-professional-developer-certificate-ibm', 'ai-practitioner-professional-certificate-aws'],
    ['construction-readiness-certificate-osha-10', 'core-construction-training-certificate'],
    ['logistics-and-supply-chain-certificate-clt', 'certified-logistics-technician-clt'],
    ['production-technology-certificate-cpt', 'certified-production-technician-cpt'],
  ] as const;

  it.each(legacyProgramSlugs)('resolves legacy slug %s', (legacySlug, canonicalSlug) => {
    expect(getProgramBySlug(legacySlug)?.slug).toBe(canonicalSlug);
  });

  it('resolves canonical slugs directly', () => {
    expect(getProgramBySlug('software-developer-professional-certificate-ibm')?.slug).toBe(
      'software-developer-professional-certificate-ibm',
    );
  });
});
