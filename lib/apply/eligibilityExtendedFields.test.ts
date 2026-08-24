import { describe, expect, it } from 'vitest';
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

describe('eligibilityExtendedFields', () => {
  it('normalizes yes/no and rejects other values', () => {
    expect(normalizeYesNo('yes')).toBe('yes');
    expect(normalizeYesNo('no')).toBe('no');
    expect(normalizeYesNo('maybe')).toBeNull();
    expect(normalizeYesNo(null)).toBeNull();
  });

  it('includes ambassador and other in hear-about options', () => {
    expect(APPLY_HEAR_ABOUT_OPTIONS).toContain(APPLY_HEAR_ABOUT_AMBASSADOR);
    expect(APPLY_HEAR_ABOUT_OPTIONS).toContain(APPLY_HEAR_ABOUT_OTHER);
  });

  it('detects other + ambassador hear-about cases', () => {
    expect(hearAboutNeedsOther(APPLY_HEAR_ABOUT_OTHER)).toBe(true);
    expect(hearAboutNeedsOther('Friend or family')).toBe(false);
    expect(hearAboutSuggestsAmbassador(APPLY_HEAR_ABOUT_AMBASSADOR)).toBe(true);
    expect(hearAboutSuggestsAmbassador('Google / web search')).toBe(false);
  });

  it('trims and caps hear-about strings', () => {
    expect(normalizeHearAbout('  Friend or family  ')).toBe('Friend or family');
    expect(normalizeHearAbout('')).toBeNull();
    expect(normalizeHearAbout('x'.repeat(250))?.length).toBe(200);
  });

  it('shows layoff company when unemployment-related answers are yes', () => {
    expect(
      layoffCompanyApplicable({
        unemployedOrUnderemployed: 'no',
        receivingUnemployment: 'no',
        exhaustedUnemployment: 'no',
      }),
    ).toBe(false);
    expect(
      layoffCompanyApplicable({
        unemployedOrUnderemployed: 'yes',
        receivingUnemployment: 'no',
        exhaustedUnemployment: 'no',
      }),
    ).toBe(true);
    expect(
      layoffCompanyApplicable({
        unemployedOrUnderemployed: 'no',
        receivingUnemployment: 'yes',
        exhaustedUnemployment: 'no',
      }),
    ).toBe(true);
  });
});
