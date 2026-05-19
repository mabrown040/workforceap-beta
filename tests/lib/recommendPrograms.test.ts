import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECOMMENDED_PROGRAM_SLUGS,
  resolveRecommendedProgramSlugs,
} from '@/lib/member/recommendPrograms';
import type { CareerMatchResult } from '@/lib/onet/types';

describe('resolveRecommendedProgramSlugs', () => {
  it('returns stored slugs when career match exists', () => {
    const match: CareerMatchResult = {
      topOccupations: [],
      recommendedPrograms: [
        {
          programSlug: 'it-support-professional-certificate-ibm',
          priority: 1,
          recommendationType: 'primary',
          whyRecommended: 'Fit',
        },
        {
          programSlug: 'ai-professional-developer-certificate-ibm',
          priority: 2,
          recommendationType: 'bridge',
          whyRecommended: 'Bridge',
        },
      ],
      experienceBand: 'beginner',
      supportFlags: { needsComputerSupport: false },
    };
    expect(resolveRecommendedProgramSlugs(match, 3)).toEqual([
      'it-support-professional-certificate-ibm',
      'ai-professional-developer-certificate-ibm',
    ]);
  });

  it('falls back to top three catalog slugs', () => {
    expect(resolveRecommendedProgramSlugs(null, 3)).toEqual(DEFAULT_RECOMMENDED_PROGRAM_SLUGS);
  });
});
